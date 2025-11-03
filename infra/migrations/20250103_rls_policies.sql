-- RLS (Row Level Security) Policies for MED-AID SAARTHI
-- Comprehensive access control for multi-role system

-- ============================================================================
-- ROLE DEFINITIONS (for reference)
-- ============================================================================
-- Roles: 'patient', 'doctor', 'asha_worker', 'gov_auditor', 'admin'

-- ============================================================================
-- 1. PROFILES TABLE POLICIES
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Patients can read their own profile
CREATE POLICY profiles_select_own 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

-- Patients can update their own profile
CREATE POLICY profiles_update_own 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Doctors can read patient profiles (for consultation context)
-- TODO: Add proper role check when implementing role system
CREATE POLICY profiles_select_doctor 
  ON profiles FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'doctor'
    )
  );

-- ============================================================================
-- 2. HEALTH RECORDS POLICIES
-- ============================================================================

ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;

-- Patients can read their own health records
CREATE POLICY health_records_select_own 
  ON health_records FOR SELECT 
  USING (user_id = auth.uid());

-- Patients can create their own health records
CREATE POLICY health_records_insert_own 
  ON health_records FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Doctors can read health records of patients they're consulting
CREATE POLICY health_records_select_doctor 
  ON health_records FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.patient_id = health_records.user_id
      AND c.doctor_id = auth.uid()
      AND c.status IN ('active', 'completed')
    )
  );

-- ============================================================================
-- 3. CONSULTATIONS POLICIES
-- ============================================================================

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- Patients can read their own consultations
CREATE POLICY consultations_select_patient 
  ON consultations FOR SELECT 
  USING (patient_id = auth.uid());

-- Doctors can read their consultations
CREATE POLICY consultations_select_doctor 
  ON consultations FOR SELECT 
  USING (doctor_id = auth.uid());

-- Doctors can update their consultations
CREATE POLICY consultations_update_doctor 
  ON consultations FOR UPDATE 
  USING (doctor_id = auth.uid());

-- Patients can create consultations
CREATE POLICY consultations_insert_patient 
  ON consultations FOR INSERT 
  WITH CHECK (patient_id = auth.uid());

-- ============================================================================
-- 4. PRESCRIPTIONS POLICIES
-- ============================================================================

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- Patients can read their own prescriptions
CREATE POLICY prescriptions_select_patient 
  ON prescriptions FOR SELECT 
  USING (
    user_id = auth.uid()
  );

-- Doctors can create prescriptions for their consultations
CREATE POLICY prescriptions_insert_doctor 
  ON prescriptions FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = consultation_id
      AND c.doctor_id = auth.uid()
    )
  );

-- Doctors can read prescriptions they've written
CREATE POLICY prescriptions_select_doctor 
  ON prescriptions FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = consultation_id
      AND c.doctor_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. APPOINTMENTS POLICIES
-- ============================================================================

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Patients can read their own appointments
CREATE POLICY appointments_select_patient 
  ON appointments FOR SELECT 
  USING (patient_id = auth.uid());

-- Doctors can read their appointments
CREATE POLICY appointments_select_doctor 
  ON appointments FOR SELECT 
  USING (doctor_id = auth.uid());

-- Patients can create appointments
CREATE POLICY appointments_insert_patient 
  ON appointments FOR INSERT 
  WITH CHECK (patient_id = auth.uid());

-- Both patients and doctors can update appointments
CREATE POLICY appointments_update_involved 
  ON appointments FOR UPDATE 
  USING (
    patient_id = auth.uid() OR doctor_id = auth.uid()
  );

-- ============================================================================
-- 6. MESSAGES POLICIES (if exists)
-- ============================================================================

-- Assuming a messages table exists for doctor-patient communication
-- CREATE TABLE IF NOT EXISTS messages (
--   id BIGSERIAL PRIMARY KEY,
--   sender_id UUID NOT NULL,
--   recipient_id UUID NOT NULL,
--   content TEXT NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages where they're sender or recipient
-- CREATE POLICY messages_select_involved 
--   ON messages FOR SELECT 
--   USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Users can insert messages as sender
-- CREATE POLICY messages_insert_sender 
--   ON messages FOR INSERT 
--   WITH CHECK (sender_id = auth.uid());

-- ============================================================================
-- 7. ADMIN BYPASS (Use with caution)
-- ============================================================================

-- Admins have full access (implement carefully in production)
-- Uncomment and modify based on your role system

-- CREATE POLICY admin_all_access ON profiles FOR ALL
--   USING (
--     EXISTS (
--       SELECT 1 FROM profiles p
--       WHERE p.id = auth.uid()
--       AND p.role = 'admin'
--     )
--   );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify RLS is working correctly:

-- 1. Check enabled RLS
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND rowsecurity = true;

-- 2. List all policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public';

-- ============================================================================
-- TESTING NOTES
-- ============================================================================

-- To test RLS policies:
-- 1. Create test users with different roles
-- 2. Use Supabase client with user tokens (not service role)
-- 3. Verify users can only access their own data
-- 4. Verify cross-role access works correctly (doctor->patient records)
-- 5. Write unit tests that attempt unauthorized access (should fail)

COMMENT ON POLICY profiles_select_own ON profiles IS 
  'Users can read their own profile';

COMMENT ON POLICY health_records_select_own ON health_records IS 
  'Patients can only read their own health records';

COMMENT ON POLICY consultations_select_patient ON consultations IS 
  'Patients can read their consultations';

COMMENT ON POLICY consultations_select_doctor ON consultations IS 
  'Doctors can read consultations they are assigned to';

-- ============================================================================
-- RLS POLICIES COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS Policies Applied';
  RAISE NOTICE '🔒 Tables secured: profiles, health_records, consultations, prescriptions, appointments';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Test policies thoroughly before production deployment';
  RAISE NOTICE '📝 Run verification queries to confirm RLS is enabled';
END $$;
