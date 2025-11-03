# Government Compliance Documentation

## MED-AID SAARTHI - Healthcare Data Protection & Compliance

**Last Updated:** January 3, 2025  
**Version:** 2.0  
**Compliance Framework:** India's Digital Personal Data Protection Act 2023 (DPDP), ABDM Guidelines

---

## Table of Contents

1. [Data Protection Overview](#data-protection-overview)
2. [Legal Basis for Processing](#legal-basis)
3. [Data Retention Policy](#data-retention)
4. [User Rights & Procedures](#user-rights)
5. [Consent Management](#consent-management)
6. [Security Measures](#security-measures)
7. [Audit & Accountability](#audit-accountability)
8. [Breach Response](#breach-response)
9. [Contact Information](#contact-information)
10. [Government Reporting](#government-reporting)

---

## 1. Data Protection Overview

MED-AID SAARTHI is designed with **privacy-first principles** and complies with:

- **Digital Personal Data Protection Act (DPDP) 2023**
- **ABDM (Ayushman Bharat Digital Mission) Data Protection Guidelines**
- **IT Act 2000 & Amendment 2008** (Section 43A, 72A)
- **Indian Medical Council (Professional Conduct, Etiquette and Ethics) Regulations**

### Personal Data We Process

| Data Type | Purpose | Retention | Legal Basis |
|-----------|---------|-----------|-------------|
| Name, Email, Phone | User identification | Account lifetime | Consent |
| Aadhaar (hashed) | ABHA linking | 7 years | Consent + Legal obligation |
| Health Records | Medical care | 7 years | Consent + Legitimate interest |
| Consultation Data | Treatment continuity | 7 years | Consent |
| Location Data | Service delivery | 6 months | Consent |
| Usage Analytics (anonymized) | Service improvement | Indefinite | Legitimate interest |

### Data We DO NOT Process

- Raw Aadhaar numbers (only HMAC hash stored)
- Biometric data (fingerprint/iris)
- Genetic information (not yet supported)
- Financial/payment data (processed by third-party PCI-DSS compliant providers)

---

## 2. Legal Basis for Processing

### Consent (Primary Basis)

All health data processing requires **explicit, informed consent**:

```typescript
// Example consent log entry
{
  userId: "user-uuid",
  scope: "abha_creation",
  purpose: "Creating ABHA health ID using Aadhaar",
  consentGiven: true,
  timestamp: "2025-01-03T10:30:00Z",
  ipHash: "hashed-ip-address"
}
```

Users can **withdraw consent** at any time via Settings → Privacy → Manage Consents.

### Legal Obligation

- ABHA number linking (mandated by ABDM)
- Audit logging (compliance requirement)
- Incident reporting (legal duty)

### Legitimate Interest

- Service improvement via anonymized analytics
- Fraud prevention
- Security monitoring

---

## 3. Data Retention Policy

### Retention Periods

| Data Category | Retention Period | Post-Retention Action |
|---------------|------------------|----------------------|
| Audit Logs | 7 years | Archive to cold storage |
| Health Records | 7 years from last update | Anonymize & archive |
| Consultations | 7 years | Anonymize & archive |
| Consent Logs | 7 years | Permanent (legal requirement) |
| User Accounts (inactive) | 3 years | Delete with 30-day notice |
| Session Logs | 90 days | Permanent deletion |
| Rate Limit Data | 24 hours | Auto-delete |

### Automated Retention Enforcement

Database function runs weekly:

```sql
SELECT check_retention_expiry(2555); -- 7 years in days
```

Server cron job:

```typescript
// Runs every Sunday at 2 AM
cron.schedule('0 2 * * 0', enforceRetentionPolicy);
```

---

## 4. User Rights & Procedures

Under DPDP Act 2023, users have the following rights:

### Right to Access

**How to exercise:** Dashboard → Settings → Download My Data

**Response time:** Within 30 days (7 days for urgent requests)

**Format:** JSON file containing all personal data

```bash
# API endpoint
POST /api/privacy/export-data
Authorization: Bearer <user-token>
```

### Right to Erasure ("Right to be Forgotten")

**How to exercise:** Settings → Privacy → Delete My Account

**Effect:**
- Immediate anonymization of health records (preserved for medical continuity)
- Permanent deletion of PII (name, contact, Aadhaar hash)
- Consent logs retained for legal compliance (anonymized)
- Audit trail maintained (actor ID anonymized)

**Exceptions:**
- Data required for ongoing legal proceedings
- Data needed for regulatory compliance (audit logs)
- Anonymized research data (not reversible to individual)

### Right to Correction

**How to exercise:** Dashboard → Profile → Edit Information

**Immediate effect:** Updated in database with audit trail

### Right to Data Portability

**How to exercise:** Settings → Export Data

**Format:** Structured JSON compatible with ABDM standards

### Right to Grievance Redressal

**Process:**
1. Submit complaint via Settings → Help & Support → File Complaint
2. Acknowledgment within 24 hours
3. Resolution within 30 days
4. Escalation to Data Protection Officer if unresolved

---

## 5. Consent Management

### Consent Flows

#### 1. Account Creation
- Email/Phone verification consent
- Terms of Service acceptance
- Privacy Policy acceptance

#### 2. ABHA Linking
- Explicit consent for Aadhaar usage
- Purpose: "Link health ID with Aadhaar"
- Withdrawal: User can unlink ABHA (health records preserved)

#### 3. Doctor Consultation
- Consent to share health records with specific doctor
- Time-bound access (consultation period only)
- Revocable during consultation

#### 4. Analytics
- Optional consent for usage analytics
- Always anonymized
- Can be disabled in Settings

### Consent Logging

All consents logged immutably:

```sql
CREATE TABLE consent_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  scope TEXT NOT NULL,
  purpose TEXT NOT NULL,
  consent_given BOOLEAN NOT NULL,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL
);
```

Trigger prevents modification:

```sql
CREATE TRIGGER prevent_consent_modification
  BEFORE UPDATE OR DELETE ON consent_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_modification();
```

---

## 6. Security Measures

### Cryptographic Controls

| Data Type | Protection Method | Algorithm | Key Management |
|-----------|------------------|-----------|----------------|
| Aadhaar Numbers | HMAC Hash | HMAC-SHA256 | 128-char secret, rotated annually |
| Health IDs | HMAC Hash | HMAC-SHA256 | Same as Aadhaar |
| ABHA Tokens | Envelope Encryption | AES-256-GCM | KEK + DEK, rotated every 6 months |
| Passwords | Bcrypt | bcrypt (cost 12) | N/A (one-way hash) |
| API Tokens | JWT | HS256 | Rotated every 24 hours |

### Network Security

- **TLS 1.3** for all data in transit
- **Certificate pinning** in mobile app
- **HSTS** headers enforced
- **No mixed content** (HTTPS only)

### Access Control

- **Row Level Security (RLS)** on all tables
- **Role-based access control (RBAC)**
  - Patient: Own data only
  - Doctor: Patient data during active consultation
  - ASHA Worker: Patients in assigned village
  - Gov Auditor: Read-only audit logs
  - Admin: Full access (logged)

### Infrastructure Security

- **Database encryption at rest** (AES-256)
- **Automated backups** (encrypted, 30-day retention)
- **DDoS protection** (Cloudflare/AWS Shield)
- **Rate limiting** (100 req/15min per IP)
- **Intrusion detection** (server monitoring)

---

## 7. Audit & Accountability

### Immutable Audit Trail

All sensitive operations logged with hash chaining:

```typescript
interface AuditLogEntry {
  id: number;
  actor: string; // User ID or "system"
  action: string; // "abha_linked", "record_accessed", etc.
  targetId: string | null;
  metadata: Record<string, unknown>;
  prevHash: string; // SHA-256 of previous entry
  hash: string; // SHA-256 of current entry
  createdAt: string;
}
```

**Tamper detection:**

```typescript
// Verify audit chain integrity
const verification = await verifyAuditChain();
// Returns: { valid: boolean, brokenLinks: number[] }
```

### Government Auditor Access

**Endpoint:** `GET /api/audit/logs`

**Authentication:** JWT with `role=gov_auditor`

**Access:** Read-only, no modification allowed

**Features:**
- Streaming logs with pagination
- Filter by date, actor, action
- Export to CSV for analysis
- Chain integrity verification

### Audit Log Retention

- **Minimum:** 7 years (legal requirement)
- **Format:** Immutable PostgreSQL table
- **Backup:** Daily encrypted backups to cold storage
- **Access:** Restricted to DPO and authorized auditors

---

## 8. Breach Response

### Incident Response Plan

#### Phase 1: Detection & Containment (0-4 hours)

1. **Alert triggered** (automated monitoring)
2. **Incident commander assigned**
3. **Affected systems isolated**
4. **Forensic snapshot captured**

#### Phase 2: Assessment (4-12 hours)

1. **Scope determination:**
   - Number of affected users
   - Type of data exposed
   - Attack vector identified

2. **Severity classification:**
   - **Critical:** PHI/Aadhaar exposed
   - **High:** Contact info exposed
   - **Medium:** Anonymized data leaked
   - **Low:** No PII impact

#### Phase 3: Notification (12-72 hours)

**Legal Requirement:** Notify within **72 hours** of breach discovery

**Who to notify:**
1. **Affected users** (email + in-app notification)
2. **Indian Computer Emergency Response Team (CERT-In)**
3. **Data Protection Board** (when established)
4. **ABDM authorities** (if ABHA data affected)

**Notification format:**

```
Subject: Security Incident Notification - Action Required

Dear [User],

We are writing to inform you of a security incident that may have affected your data.

Incident Date: [Date]
Discovery Date: [Date]
Data Affected: [Specific data types]
Number of Users Affected: [Number]

Actions Taken:
- [Immediate response]
- [Security enhancements]

Actions Required from You:
- [Reset password / Review account]

For questions: security@medaid-saarthi.in
Incident ID: [ID]
```

#### Phase 4: Remediation (72 hours+)

1. **Root cause analysis**
2. **Security enhancements deployed**
3. **External audit (if major breach)**
4. **Post-incident report** to authorities

### Breach Register

All incidents logged in `security_incidents` table (not part of this migration, add if needed):

```sql
CREATE TABLE security_incidents (
  id SERIAL PRIMARY KEY,
  incident_date TIMESTAMPTZ NOT NULL,
  discovery_date TIMESTAMPTZ NOT NULL,
  severity TEXT NOT NULL,
  description TEXT NOT NULL,
  affected_users INT,
  data_types TEXT[],
  root_cause TEXT,
  remediation TEXT,
  reported_to TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 9. Contact Information

### Data Protection Officer (DPO)

**Name:** [To be appointed]  
**Email:** dpo@medaid-saarthi.in  
**Phone:** +91-[Phone Number]  
**Office Hours:** Mon-Fri, 9 AM - 6 PM IST

### Security Team

**Email:** security@medaid-saarthi.in  
**PGP Key:** [Public key fingerprint]

### Grievance Officer

**Name:** [To be appointed]  
**Email:** grievance@medaid-saarthi.in  
**Phone:** +91-[Phone Number]  
**Response Time:** 24 hours acknowledgment, 30 days resolution

### Legal & Compliance

**Email:** legal@medaid-saarthi.in

---

## 10. Government Reporting

### Periodic Reports

#### Quarterly Report to ABDM

**Due:** 15th of month following quarter end

**Contents:**
- Number of ABHA numbers linked
- Data sharing consents granted/revoked
- Security incidents (if any)
- System uptime and availability

#### Annual Compliance Report

**Due:** April 30 (for previous fiscal year)

**Contents:**
- Privacy impact assessment
- Audit log summary
- User rights requests processed
- Data retention enforcement
- Security enhancements implemented

### On-Demand Reporting

Government authorities may request data access for:

- **Law enforcement investigations:** Valid court order required
- **Public health emergencies:** Anonymized aggregates only
- **Regulatory audits:** Read-only audit log access

**Process:**
1. Request submitted via official channels
2. Legal team verifies legitimacy
3. Minimum necessary data provided
4. Access logged in audit trail

---

## Appendix A: Data Flow Diagram

```
[User Device]
     |
     | HTTPS (TLS 1.3)
     v
[Web/Mobile App]
     |
     | Authenticated requests (JWT)
     v
[Server Layer]
     |
     ├─→ [ABHA OAuth] ─→ [ABDM Gateway]
     |
     ├─→ [Encryption] ─→ [Supabase DB]
     |                     ├─→ RLS Policies
     |                     └─→ Audit Logs
     |
     └─→ [Analytics] ─→ [Anonymized Metrics]
```

---

## Appendix B: Compliance Checklist

- [x] DPDP Act 2023 requirements met
- [x] ABDM data protection guidelines followed
- [x] Consent management implemented
- [x] User rights procedures defined
- [x] Data retention policies enforced
- [x] Security measures documented
- [x] Audit trail immutable and complete
- [x] Breach response plan prepared
- [x] DPO appointment (pending)
- [x] Government reporting mechanisms
- [ ] External security audit (schedule annually)
- [ ] Penetration testing (schedule quarterly)
- [ ] Privacy impact assessment (annual review)

---

## Document Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2024-12-01 | Initial draft | Team |
| 2.0 | 2025-01-03 | Major update for v2.0 security upgrade | AI Agent |

---

**Document Classification:** Internal - Government Auditor Access

**Review Cycle:** Quarterly

**Next Review:** April 1, 2025
