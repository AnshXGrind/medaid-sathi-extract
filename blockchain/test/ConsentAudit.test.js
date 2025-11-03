const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ConsentAudit Smart Contract", function () {
  let consentAudit;
  let owner;
  let backend;
  let unauthorized;

  // Sample hashed identifiers (in production, these come from backend)
  const consentId = ethers.id("consent_123");
  const patientHash = ethers.id("patient_456");
  const doctorHash = ethers.id("doctor_789");
  const recordHash = ethers.id("record_abc");
  const uploaderHash = ethers.id("uploader_xyz");
  const viewerHash = ethers.id("viewer_def");

  beforeEach(async function () {
    [owner, backend, unauthorized] = await ethers.getSigners();

    // Deploy contract
    const ConsentAudit = await ethers.getContractFactory("ConsentAudit");
    consentAudit = await ConsentAudit.deploy(backend.address);
    await consentAudit.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await consentAudit.owner()).to.equal(owner.address);
    });

    it("Should set the correct authorized backend", async function () {
      expect(await consentAudit.authorizedBackend()).to.equal(backend.address);
    });

    it("Should initialize counters to zero", async function () {
      const stats = await consentAudit.getStats();
      expect(stats[0]).to.equal(0); // totalConsents
      expect(stats[1]).to.equal(0); // totalRecords
      expect(stats[2]).to.equal(0); // totalViews
    });
  });

  describe("Consent Logging", function () {
    it("Should log consent successfully", async function () {
      await expect(
        consentAudit.connect(backend).logConsent(
          consentId,
          patientHash,
          doctorHash,
          recordHash
        )
      )
        .to.emit(consentAudit, "ConsentLogged")
        .withArgs(consentId, patientHash, doctorHash, recordHash, await ethers.provider.getBlock('latest').then(b => b.timestamp + 1));

      const consent = await consentAudit.getConsent(consentId);
      expect(consent.consentId).to.equal(consentId);
      expect(consent.patientHash).to.equal(patientHash);
      expect(consent.doctorHash).to.equal(doctorHash);
      expect(consent.recordHash).to.equal(recordHash);
      expect(consent.revoked).to.equal(false);
    });

    it("Should reject unauthorized consent logging", async function () {
      await expect(
        consentAudit.connect(unauthorized).logConsent(
          consentId,
          patientHash,
          doctorHash,
          recordHash
        )
      ).to.be.revertedWith("ConsentAudit: Unauthorized caller");
    });

    it("Should reject duplicate consent IDs", async function () {
      await consentAudit.connect(backend).logConsent(
        consentId,
        patientHash,
        doctorHash,
        recordHash
      );

      await expect(
        consentAudit.connect(backend).logConsent(
          consentId,
          patientHash,
          doctorHash,
          recordHash
        )
      ).to.be.revertedWith("ConsentAudit: Consent already logged");
    });

    it("Should verify consent is valid after logging", async function () {
      await consentAudit.connect(backend).logConsent(
        consentId,
        patientHash,
        doctorHash,
        recordHash
      );

      const isValid = await consentAudit.isConsentValid(consentId);
      expect(isValid).to.equal(true);
    });

    it("Should increment consent counter", async function () {
      await consentAudit.connect(backend).logConsent(
        consentId,
        patientHash,
        doctorHash,
        recordHash
      );

      const stats = await consentAudit.getStats();
      expect(stats[0]).to.equal(1); // totalConsents
    });
  });

  describe("Consent Revocation", function () {
    beforeEach(async function () {
      // Log consent first
      await consentAudit.connect(backend).logConsent(
        consentId,
        patientHash,
        doctorHash,
        recordHash
      );
    });

    it("Should revoke consent successfully", async function () {
      await expect(
        consentAudit.connect(backend).revokeConsent(consentId)
      )
        .to.emit(consentAudit, "ConsentRevoked")
        .withArgs(consentId, await ethers.provider.getBlock('latest').then(b => b.timestamp + 1));

      const consent = await consentAudit.getConsent(consentId);
      expect(consent.revoked).to.equal(true);
      expect(consent.revokedAt).to.be.gt(0);
    });

    it("Should reject unauthorized revocation", async function () {
      await expect(
        consentAudit.connect(unauthorized).revokeConsent(consentId)
      ).to.be.revertedWith("ConsentAudit: Unauthorized caller");
    });

    it("Should reject revoking non-existent consent", async function () {
      const nonExistentId = ethers.id("non_existent");
      
      await expect(
        consentAudit.connect(backend).revokeConsent(nonExistentId)
      ).to.be.revertedWith("ConsentAudit: Consent not found");
    });

    it("Should reject double revocation", async function () {
      await consentAudit.connect(backend).revokeConsent(consentId);

      await expect(
        consentAudit.connect(backend).revokeConsent(consentId)
      ).to.be.revertedWith("ConsentAudit: Already revoked");
    });

    it("Should mark consent as invalid after revocation", async function () {
      await consentAudit.connect(backend).revokeConsent(consentId);

      const isValid = await consentAudit.isConsentValid(consentId);
      expect(isValid).to.equal(false);
    });
  });

  describe("Record Logging", function () {
    it("Should log record successfully", async function () {
      await expect(
        consentAudit.connect(backend).logRecord(
          recordHash,
          "patient",
          uploaderHash
        )
      )
        .to.emit(consentAudit, "RecordLogged")
        .withArgs(recordHash, "patient", uploaderHash, await ethers.provider.getBlock('latest').then(b => b.timestamp + 1));

      const record = await consentAudit.getRecord(recordHash);
      expect(record.recordHash).to.equal(recordHash);
      expect(record.uploaderRole).to.equal("patient");
      expect(record.uploaderHash).to.equal(uploaderHash);
    });

    it("Should reject unauthorized record logging", async function () {
      await expect(
        consentAudit.connect(unauthorized).logRecord(
          recordHash,
          "patient",
          uploaderHash
        )
      ).to.be.revertedWith("ConsentAudit: Unauthorized caller");
    });

    it("Should reject duplicate record hashes", async function () {
      await consentAudit.connect(backend).logRecord(
        recordHash,
        "patient",
        uploaderHash
      );

      await expect(
        consentAudit.connect(backend).logRecord(
          recordHash,
          "doctor",
          uploaderHash
        )
      ).to.be.revertedWith("ConsentAudit: Record already logged");
    });

    it("Should increment record counter", async function () {
      await consentAudit.connect(backend).logRecord(
        recordHash,
        "doctor",
        uploaderHash
      );

      const stats = await consentAudit.getStats();
      expect(stats[1]).to.equal(1); // totalRecords
    });
  });

  describe("View Logging", function () {
    beforeEach(async function () {
      // Log record first
      await consentAudit.connect(backend).logRecord(
        recordHash,
        "patient",
        uploaderHash
      );
    });

    it("Should log view event successfully", async function () {
      await expect(
        consentAudit.connect(backend).logView(
          viewerHash,
          recordHash,
          "consultation"
        )
      )
        .to.emit(consentAudit, "ViewLogged")
        .withArgs(viewerHash, recordHash, await ethers.provider.getBlock('latest').then(b => b.timestamp + 1), "consultation");

      const viewCount = await consentAudit.getViewCount(recordHash);
      expect(viewCount).to.equal(1);
    });

    it("Should reject unauthorized view logging", async function () {
      await expect(
        consentAudit.connect(unauthorized).logView(
          viewerHash,
          recordHash,
          "consultation"
        )
      ).to.be.revertedWith("ConsentAudit: Unauthorized caller");
    });

    it("Should reject viewing non-existent record", async function () {
      const nonExistentRecord = ethers.id("non_existent_record");

      await expect(
        consentAudit.connect(backend).logView(
          viewerHash,
          nonExistentRecord,
          "consultation"
        )
      ).to.be.revertedWith("ConsentAudit: Record not found");
    });

    it("Should increment view counter on multiple views", async function () {
      await consentAudit.connect(backend).logView(
        viewerHash,
        recordHash,
        "consultation"
      );

      const viewer2Hash = ethers.id("viewer_2");
      await consentAudit.connect(backend).logView(
        viewer2Hash,
        recordHash,
        "emergency"
      );

      const viewCount = await consentAudit.getViewCount(recordHash);
      expect(viewCount).to.equal(2);
    });

    it("Should increment total views counter", async function () {
      await consentAudit.connect(backend).logView(
        viewerHash,
        recordHash,
        "consultation"
      );

      const stats = await consentAudit.getStats();
      expect(stats[2]).to.equal(1); // totalViews
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update backend address", async function () {
      const newBackend = unauthorized.address;

      await expect(
        consentAudit.connect(owner).updateBackend(newBackend)
      )
        .to.emit(consentAudit, "BackendUpdated")
        .withArgs(backend.address, newBackend, await ethers.provider.getBlock('latest').then(b => b.timestamp + 1));

      expect(await consentAudit.authorizedBackend()).to.equal(newBackend);
    });

    it("Should reject non-owner updating backend", async function () {
      await expect(
        consentAudit.connect(unauthorized).updateBackend(unauthorized.address)
      ).to.be.revertedWith("ConsentAudit: Owner only");
    });

    it("Should allow owner to transfer ownership", async function () {
      await consentAudit.connect(owner).transferOwnership(backend.address);
      expect(await consentAudit.owner()).to.equal(backend.address);
    });

    it("Should reject non-owner transferring ownership", async function () {
      await expect(
        consentAudit.connect(unauthorized).transferOwnership(unauthorized.address)
      ).to.be.revertedWith("ConsentAudit: Owner only");
    });
  });

  describe("Statistics", function () {
    it("Should track all statistics correctly", async function () {
      // Log consent
      await consentAudit.connect(backend).logConsent(
        consentId,
        patientHash,
        doctorHash,
        recordHash
      );

      // Log record
      await consentAudit.connect(backend).logRecord(
        recordHash,
        "patient",
        uploaderHash
      );

      // Log view
      await consentAudit.connect(backend).logView(
        viewerHash,
        recordHash,
        "consultation"
      );

      const stats = await consentAudit.getStats();
      expect(stats[0]).to.equal(1); // totalConsents
      expect(stats[1]).to.equal(1); // totalRecords
      expect(stats[2]).to.equal(1); // totalViews
    });
  });
});
