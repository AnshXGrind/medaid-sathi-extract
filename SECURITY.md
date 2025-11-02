# Security Policy

## 🔒 Security Commitment

MedAid Sathi takes security seriously, especially given we handle sensitive health data and PII (Personally Identifiable Information). This document outlines our security practices, compliance measures, and vulnerability reporting process.

---

## 🛡️ Security Features

### 1. **Zero Raw Aadhaar Storage**

We implement **zero-knowledge Aadhaar handling**:

- ✅ **HMAC-SHA256** with server secret (not plain SHA-256)
- ✅ **No rainbow table attacks** - uses secret key from KMS
- ✅ **Only last 4 digits stored** for display (masked as `XXXX-XXXX-1234`)
- ✅ **Raw Aadhaar never logged** or written to disk
- ✅ **Constant-time comparison** prevents timing attacks
- ✅ **Audit trail** for all Aadhaar operations

**Implementation**: See `src/lib/secureAadhaar.ts`

**UIDAI Compliance**: Follows Aadhaar (Sharing of Information) Regulations, 2016

### 2. **Row Level Security (RLS)**

All Supabase tables with PII have RLS enabled:

```sql
-- Example: patients table
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_own_data ON public.patients
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY service_role_full_access ON public.patients
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

**Tables with RLS**:
- `patients` - Patient profiles and metadata
- `health_records` - Medical records and documents
- `appointments` - Appointment data
- `prescriptions` - Prescription information
- `audit_logs` - Security audit trail

### 3. **Environment Security**

**Required Secrets** (never commit to repo):

```env
# .env (NEVER COMMIT THIS FILE)

# Supabase (rotate if exposed)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key  # Server-side only!

# Aadhaar HMAC (min 32 chars, from KMS in production)
VITE_AADHAAR_HMAC_SECRET=your-secure-random-secret-min-32-chars

# Google Maps (restrict by domain/IP)
VITE_GOOGLE_MAPS_API_KEY=your-maps-key

# NDHM/ABHA (from NDHM sandbox/production)
VITE_NDHM_CLIENT_ID=your-ndhm-client-id
VITE_NDHM_CLIENT_SECRET=your-ndhm-secret
```

**Secret Management**:
- Development: Use `.env.local` (gitignored)
- Staging/Production: Use **Vercel secrets**, **AWS KMS**, or **Supabase Vault**
- Rotate secrets quarterly or after exposure

### 4. **NDHM/ABHA Integration Security**

- ✅ OAuth 2.0 authorization flow with PKCE
- ✅ Consent tokens stored encrypted
- ✅ ABHA address never stored in plain text
- ✅ Health records fetched on-demand (not cached)
- ✅ M3 consent flows for data sharing

**Note**: NDHM production requires formal onboarding and sandbox testing.

### 5. **Data Protection Measures**

| Data Type | Storage Method | Access Control |
|-----------|---------------|----------------|
| Aadhaar Number | **NEVER stored** (HMAC only) | N/A |
| ABHA Address | Encrypted at rest | User + service role |
| Health Records | Encrypted at rest (Supabase) | RLS by user_id |
| Session Tokens | HTTP-only cookies | 24hr expiry |
| Audit Logs | Append-only table | Service role only |

### 6. **Frontend Security**

- ✅ **HTTPS only** in production (enforced by Netlify/Vercel)
- ✅ **Content Security Policy** (CSP) headers
- ✅ **No sensitive data in localStorage** (use sessionStorage with encryption)
- ✅ **Input validation** on all forms (Zod schemas)
- ✅ **XSS protection** via React's automatic escaping
- ✅ **CSRF protection** via Supabase JWT tokens

---

## ⚖️ Compliance & Legal

### UIDAI Aadhaar Regulations

**Compliance Status**:
- ✅ No raw Aadhaar storage (HMAC-only)
- ✅ Consent collected before Aadhaar processing
- ✅ Purpose-limited data collection
- ⚠️ **TODO**: Legal review for production deployment
- ⚠️ **TODO**: DPIA (Data Protection Impact Assessment)

**References**:
- [UIDAI Regulations](https://uidai.gov.in/legal-framework/regulations.html)
- [Aadhaar Act, 2016](https://uidai.gov.in/images/targeted_delivery_of_financial_and_other_subsidies_benefits_and_services_13072016.pdf)

### NDHM Health Data Management Policy

**Compliance Status**:
- ✅ M3 consent flows (in progress)
- ✅ Health records encrypted at rest
- ✅ User controls data sharing
- ⚠️ **TODO**: NDHM certification for production
- ⚠️ **TODO**: Health Information Provider (HIP) registration

**References**:
- [NDHM Health Data Management Policy](https://ndhm.gov.in/health_management_policy)

### HIPAA-Equivalent Best Practices

While not US-based, we follow HIPAA-equivalent standards:
- ✅ Encryption in transit (TLS 1.3)
- ✅ Encryption at rest (Supabase AES-256)
- ✅ Access logs and audit trails
- ✅ Minimum necessary data collection
- ✅ Patient consent management

---

## 🔍 Security Checklist (Before Production)

### Pre-Deployment
- [ ] `.env` removed from repository (git history cleaned)
- [ ] All secrets rotated after exposure
- [ ] HMAC secret min 32 chars (from KMS)
- [ ] RLS enabled on all PII tables
- [ ] RLS policies tested (unit tests + manual)
- [ ] Supabase service key never exposed to frontend
- [ ] Google Maps API key restricted by domain
- [ ] NDHM credentials from production (not sandbox)

### Code Security
- [ ] No plain Aadhaar in logs (console.log, error logs)
- [ ] No sensitive data in frontend bundle
- [ ] Input validation on all forms (Zod/Yup)
- [ ] SQL injection prevented (parameterized queries only)
- [ ] XSS prevented (React escaping + CSP)
- [ ] Dependencies scanned (`npm audit`)

### Infrastructure
- [ ] HTTPS enforced (HSTS headers)
- [ ] CSP headers configured
- [ ] Rate limiting on API endpoints
- [ ] DDoS protection (Cloudflare/Vercel)
- [ ] Backup encryption enabled
- [ ] Database access from trusted IPs only

### Monitoring
- [ ] Error tracking (Sentry/Rollbar)
- [ ] Audit log monitoring
- [ ] Anomaly detection alerts
- [ ] Security incident response plan

---

## 🚨 Vulnerability Reporting

### Reporting a Security Issue

**DO NOT** open a public GitHub issue for security vulnerabilities.

**Report via**:
- Email: **security@medaidsathi.com** (preferred)
- GitHub Security Advisory: [Create Private Advisory](https://github.com/AnshXGrind/medaid-sathi-extract/security/advisories/new)

**Include**:
1. **Description** of the vulnerability
2. **Steps to reproduce** (proof-of-concept)
3. **Impact assessment** (CVSS score if possible)
4. **Affected versions**
5. **Suggested fix** (if known)

**Response SLA**:
- **Critical** (RCE, data breach): 24 hours
- **High** (auth bypass, PII leak): 48 hours
- **Medium** (XSS, CSRF): 7 days
- **Low** (info disclosure): 14 days

### Disclosure Policy

We follow **coordinated disclosure**:
1. Report received → acknowledged within 24h
2. Vulnerability confirmed → 7 days
3. Fix developed → 14 days
4. Fix deployed → 30 days
5. Public disclosure → 90 days (or after fix deployed)

### Bug Bounty

- **Status**: Not currently available
- **Future**: Considering HackerOne/Bugcrowd program after production launch

---

## 🛠️ Security Tools & Processes

### Automated Security Checks

**GitHub Actions CI** (runs on every PR):
```yaml
- TypeScript type checking (tsc --noEmit)
- ESLint security rules
- npm audit (moderate+ vulnerabilities)
- Dependency vulnerability scan
- Secret scanning (git-secrets)
```

**Pre-commit Hooks**:
```bash
# Install
npm install --save-dev husky lint-staged

# Runs before commit
- Prettier formatting
- ESLint
- Type checking
- Secret pattern detection
```

### Manual Security Reviews

**Monthly**:
- Dependency updates (`npm update`)
- Secret rotation (quarterly for HMAC keys)
- RLS policy audit

**Quarterly**:
- Penetration testing (external firm)
- UIDAI compliance review
- NDHM policy updates

**Annually**:
- Full security audit (VAPT)
- Legal compliance review (UIDAI/NDHM)
- Disaster recovery drill

---

## 📚 Security Resources

### Internal Documentation
- `src/lib/secureAadhaar.ts` - Aadhaar handling implementation
- `supabase/migrations/` - RLS policy migrations
- `.github/workflows/ci.yml` - Security CI pipeline

### External References
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/going-into-prod)
- [UIDAI Security Guidelines](https://uidai.gov.in/)

---

## 🔄 Security Updates

### Recent Changes

**v2.0.0 (November 2025)**:
- ✅ Migrated from plain SHA-256 to HMAC-SHA256
- ✅ Added constant-time comparison for hashes
- ✅ Implemented audit logging for Aadhaar operations
- ✅ Added `.env` to `.gitignore`
- ✅ Rotated all exposed secrets

**v1.5.0 (October 2025)**:
- ✅ Enabled RLS on all PII tables
- ✅ Added service role policies
- ✅ Implemented consent flow for ABHA

### Upcoming

**Q1 2026**:
- [ ] NDHM production certification
- [ ] External penetration test
- [ ] SOC 2 Type 1 audit (future)

---

## 📞 Security Contact

**Security Team**: security@medaidsathi.com  
**Response Time**: 24-48 hours  
**PGP Key**: [Available on request]

---

## 📄 License & Attribution

This security policy is released under the same license as the MedAid Sathi project.

**Last Updated**: November 3, 2025  
**Version**: 2.0.0  
**Next Review**: February 2026
