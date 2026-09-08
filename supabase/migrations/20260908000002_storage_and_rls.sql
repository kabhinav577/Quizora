-- ============================================================
-- QUIZORA DATABASE SCHEMA MIGRATION 02: STORAGE AND RLS
-- ============================================================

-- 1. ADMIN AUTHORIZATION HELPER
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Student User'),
    new.raw_user_meta_data->>'avatar_url',
    COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'student'::public.user_role)
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR PROFILES
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- 5. RLS POLICIES FOR EXAMS
CREATE POLICY "Active exams viewable by everyone"
  ON public.exams FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins can manage exams"
  ON public.exams FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6. RLS POLICIES FOR SUBJECTS
CREATE POLICY "Active subjects viewable by everyone"
  ON public.subjects FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins can manage subjects"
  ON public.subjects FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7. RLS POLICIES FOR TOPICS
CREATE POLICY "Active topics viewable by everyone"
  ON public.topics FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins can manage topics"
  ON public.topics FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 8. RLS POLICIES FOR QUESTIONS
CREATE POLICY "Published questions viewable by authenticated users"
  ON public.questions FOR SELECT
  USING (status = 'published' OR public.is_admin());

CREATE POLICY "Admins can manage questions"
  ON public.questions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 9. RLS POLICIES FOR TESTS
CREATE POLICY "Published tests viewable by authenticated users"
  ON public.tests FOR SELECT
  USING (status = 'published' OR public.is_admin());

CREATE POLICY "Admins can manage tests"
  ON public.tests FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 10. RLS POLICIES FOR TEST_QUESTIONS
CREATE POLICY "Test questions viewable by authenticated users"
  ON public.test_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tests
      WHERE tests.id = test_questions.test_id
      AND (tests.status = 'published' OR public.is_admin())
    )
  );

CREATE POLICY "Admins can manage test_questions"
  ON public.test_questions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 11. RLS POLICIES FOR ATTEMPTS
CREATE POLICY "Users can view own attempts"
  ON public.attempts FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can create own attempts"
  ON public.attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attempts"
  ON public.attempts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 12. RLS POLICIES FOR ATTEMPT_QUESTIONS
CREATE POLICY "Users can view own attempt questions"
  ON public.attempt_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.attempts
      WHERE attempts.id = attempt_questions.attempt_id
      AND (attempts.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Users can insert own attempt questions"
  ON public.attempt_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.attempts
      WHERE attempts.id = attempt_questions.attempt_id
      AND attempts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own attempt questions"
  ON public.attempt_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.attempts
      WHERE attempts.id = attempt_questions.attempt_id
      AND attempts.user_id = auth.uid()
    )
  );

-- 13. RLS POLICIES FOR BOOKMARKS
CREATE POLICY "Users can manage own bookmarks"
  ON public.bookmarks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 14. RLS POLICIES FOR QUESTION_REPORTS
CREATE POLICY "Users can view own reports"
  ON public.question_reports FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can create reports"
  ON public.question_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update reports"
  ON public.question_reports FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 15. STORAGE BUCKET CREATION FOR QUIZORA MEDIA
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quizora-media',
  'quizora-media',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 16. STORAGE POLICIES
CREATE POLICY "Public media access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'quizora-media');

CREATE POLICY "Admins can upload media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'quizora-media' AND public.is_admin());

CREATE POLICY "Admins can update media"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'quizora-media' AND public.is_admin());

CREATE POLICY "Admins can delete media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'quizora-media' AND public.is_admin());
