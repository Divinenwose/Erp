-- Add real storage for HR performance reviews and training courses.

CREATE TABLE IF NOT EXISTS performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  review_period text NOT NULL,
  score numeric(3,2),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  goals text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text,
  duration_hours numeric(8,2),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'cancelled')),
  enrolled_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(course_id, employee_id)
);

ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_enrollments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_performance_reviews_company ON performance_reviews(company_id);
CREATE INDEX IF NOT EXISTS idx_training_courses_company ON training_courses(company_id);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_company ON training_enrollments(company_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'performance_reviews' AND policyname = 'company_access_performance_reviews') THEN
    CREATE POLICY company_access_performance_reviews ON performance_reviews FOR ALL TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_courses' AND policyname = 'company_access_training_courses') THEN
    CREATE POLICY company_access_training_courses ON training_courses FOR ALL TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_enrollments' AND policyname = 'company_access_training_enrollments') THEN
    CREATE POLICY company_access_training_enrollments ON training_enrollments FOR ALL TO authenticated USING (company_id = user_company_id()) WITH CHECK (company_id = user_company_id());
  END IF;
END $$;
