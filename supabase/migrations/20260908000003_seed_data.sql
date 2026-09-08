-- ============================================================
-- QUIZORA DATABASE SCHEMA MIGRATION 03: SEED DATA
-- ============================================================

DO $$
DECLARE
  v_exam_id UUID := '11111111-1111-1111-1111-111111111111';
  v_subject_id UUID := '22222222-2222-2222-2222-222222222222';
  v_topic_cf UUID := '33333333-3333-3333-3333-333333333301';
  v_topic_os UUID := '33333333-3333-3333-3333-333333333302';
  v_topic_dbms UUID := '33333333-3333-3333-3333-333333333303';
  v_topic_cn UUID := '33333333-3333-3333-3333-333333333304';
  v_topic_ds UUID := '33333333-3333-3333-3333-333333333305';
  v_topic_se UUID := '33333333-3333-3333-3333-333333333306';

  v_q1 UUID := '44444444-4444-4444-4444-444444444401';
  v_q2 UUID := '44444444-4444-4444-4444-444444444402';
  v_q3 UUID := '44444444-4444-4444-4444-444444444403';
  v_q4 UUID := '44444444-4444-4444-4444-444444444404';
  v_q5 UUID := '44444444-4444-4444-4444-444444444405';

  v_test_mock UUID := '55555555-5555-5555-5555-555555555501';
  v_test_practice UUID := '55555555-5555-5555-5555-555555555502';
BEGIN

  -- 1. Insert Exam: Bihar STET
  INSERT INTO public.exams (id, name, slug, description, is_active)
  VALUES (
    v_exam_id,
    'Bihar STET',
    'bihar-stet',
    'Bihar Secondary Teachers Eligibility Test for High School & Higher Secondary Teachers',
    true
  ) ON CONFLICT (id) DO NOTHING;

  -- 2. Insert Subject: Computer Science
  INSERT INTO public.subjects (id, exam_id, name, slug, description, display_order, is_active)
  VALUES (
    v_subject_id,
    v_exam_id,
    'Computer Science',
    'computer-science',
    'Core Computer Science syllabus including OS, DBMS, Networks, and Programming',
    1,
    true
  ) ON CONFLICT (id) DO NOTHING;

  -- 3. Insert Topics
  INSERT INTO public.topics (id, subject_id, name, slug, description, display_order, is_active)
  VALUES
    (v_topic_cf, v_subject_id, 'Computer Fundamentals', 'computer-fundamentals', 'Hardware, Memory, CPU Architecture', 1, true),
    (v_topic_os, v_subject_id, 'Operating Systems', 'operating-systems', 'Processes, Scheduling, Deadlocks, Memory Management', 2, true),
    (v_topic_dbms, v_subject_id, 'DBMS', 'dbms', 'Relational Model, SQL, Normalization, Transactions', 3, true),
    (v_topic_cn, v_subject_id, 'Computer Networks', 'computer-networks', 'OSI Model, TCP/IP, Routing, Protocols', 4, true),
    (v_topic_ds, v_subject_id, 'Data Structures', 'data-structures', 'Arrays, Trees, Graphs, Sorting Algorithms', 5, true),
    (v_topic_se, v_subject_id, 'Software Engineering', 'software-engineering', 'SDLC, Agile, UML Diagrams, Testing', 6, true)
  ON CONFLICT (id) DO NOTHING;

  -- 4. Question 1: 4-option Text Question (OS)
  INSERT INTO public.questions (
    id, exam_id, subject_id, topic_id, question_type,
    question_text, question_image_path,
    options, correct_option,
    explanation, difficulty, default_time_seconds, marks, negative_marks,
    source_name, source_year, status
  ) VALUES (
    v_q1, v_exam_id, v_subject_id, v_topic_os, 'single_select',
    'Which of the following CPU scheduling algorithms may cause starvation for low-priority processes?',
    NULL,
    '[
      {"text": "First-Come First-Served (FCFS)", "image_path": null},
      {"text": "Round Robin (RR)", "image_path": null},
      {"text": "Shortest Job First (SJF) / Priority Scheduling", "image_path": null},
      {"text": "First In First Out (FIFO)", "image_path": null}
    ]'::JSONB,
    3,
    'Priority Scheduling and Shortest Job First (SJF) can lead to starvation (indefinite blocking) where low priority or long CPU burst processes may never execute if higher priority or shorter jobs continuously arrive. Aging is the standard technique used to prevent starvation.',
    'medium', 45, 1.00, 0.25,
    'Bihar STET', 2024, 'published'
  ) ON CONFLICT (id) DO NOTHING;

  -- 5. Question 2: 5-option UML Diagram Question (Image Question + 5 Text Options)
  INSERT INTO public.questions (
    id, exam_id, subject_id, topic_id, question_type,
    question_text, question_image_path,
    options, correct_option,
    explanation, difficulty, default_time_seconds, marks, negative_marks,
    source_name, source_year, status
  ) VALUES (
    v_q2, v_exam_id, v_subject_id, v_topic_se, 'single_select',
    'Study the following diagram and identify which behavioral UML diagrams represent dynamic system workflows.',
    'questions/uml-workflow-diagram.webp',
    '[
      {"text": "Activity diagram", "image_path": null},
      {"text": "State machine diagram", "image_path": null},
      {"text": "Both (A) and (B)", "image_path": null},
      {"text": "More than one of the above", "image_path": null},
      {"text": "None of the above", "image_path": null}
    ]'::JSONB,
    3,
    'Both Activity diagrams and State Machine diagrams are UML behavioral diagrams used to model dynamic workflows and state transitions in software systems.',
    'hard', 60, 1.00, 0.25,
    'Bihar STET', 2024, 'published'
  ) ON CONFLICT (id) DO NOTHING;

  -- 6. Question 3: 4 Image Options (Text Question + 4 Image Options - Logic Gates)
  INSERT INTO public.questions (
    id, exam_id, subject_id, topic_id, question_type,
    question_text, question_image_path,
    options, correct_option,
    explanation, difficulty, default_time_seconds, marks, negative_marks,
    source_name, source_year, status
  ) VALUES (
    v_q3, v_exam_id, v_subject_id, v_topic_cf, 'single_select',
    'Which of the following logic gate symbols produces an output of HIGH (1) only when all its inputs are HIGH (1)?',
    NULL,
    '[
      {"text": null, "image_path": "questions/gates/and-gate.webp"},
      {"text": null, "image_path": "questions/gates/or-gate.webp"},
      {"text": null, "image_path": "questions/gates/nand-gate.webp"},
      {"text": null, "image_path": "questions/gates/xor-gate.webp"}
    ]'::JSONB,
    1,
    'An AND gate outputs 1 (True) if and only if all of its inputs are 1 (True).',
    'easy', 30, 1.00, 0.25,
    'Bihar STET', 2023, 'published'
  ) ON CONFLICT (id) DO NOTHING;

  -- 7. Question 4: Mixed text/image options (Data Structures)
  INSERT INTO public.questions (
    id, exam_id, subject_id, topic_id, question_type,
    question_text, question_image_path,
    options, correct_option,
    explanation, difficulty, default_time_seconds, marks, negative_marks,
    source_name, source_year, status
  ) VALUES (
    v_q4, v_exam_id, v_subject_id, v_topic_ds, 'single_select',
    'Which of the following represents a balanced Binary Search Tree (AVL tree) where balance factor of every node is within {-1, 0, +1}?',
    'questions/ds-balance-tree.webp',
    '[
      {"text": "Tree configuration A (Skewed Left)", "image_path": "questions/trees/tree-a.webp"},
      {"text": "Tree configuration B (AVL Balanced)", "image_path": "questions/trees/tree-b.webp"},
      {"text": "Tree configuration C (Degenerate)", "image_path": null},
      {"text": "All of the above", "image_path": null}
    ]'::JSONB,
    2,
    'In an AVL Tree, for every node the height difference between the left and right subtrees must not exceed 1.',
    'medium', 45, 1.00, 0.25,
    'Bihar STET', 2024, 'published'
  ) ON CONFLICT (id) DO NOTHING;

  -- 8. Question 5: 5-option DBMS question
  INSERT INTO public.questions (
    id, exam_id, subject_id, topic_id, question_type,
    question_text, question_image_path,
    options, correct_option,
    explanation, difficulty, default_time_seconds, marks, negative_marks,
    source_name, source_year, status
  ) VALUES (
    v_q5, v_exam_id, v_subject_id, v_topic_dbms, 'single_select',
    'Which normal form eliminates transitive dependency in relational database design?',
    NULL,
    '[
      {"text": "First Normal Form (1NF)", "image_path": null},
      {"text": "Second Normal Form (2NF)", "image_path": null},
      {"text": "Third Normal Form (3NF)", "image_path": null},
      {"text": "Boyce-Codd Normal Form (BCNF)", "image_path": null},
      {"text": "None of the above", "image_path": null}
    ]'::JSONB,
    3,
    'Third Normal Form (3NF) requires a table to be in 2NF and have no transitive dependencies of non-prime attributes on candidate keys.',
    'easy', 30, 1.00, 0.25,
    'Bihar STET', 2024, 'published'
  ) ON CONFLICT (id) DO NOTHING;

  -- 9. Insert Tests
  INSERT INTO public.tests (
    id, exam_id, title, slug, description, test_type,
    duration_seconds, question_time_seconds, marks_per_question, negative_marks,
    shuffle_questions, shuffle_options, show_result_immediately, show_explanations,
    total_questions, status
  ) VALUES (
    v_test_mock,
    v_exam_id,
    'Bihar STET Computer Science Full Mock Test 1',
    'bihar-stet-cs-mock-1',
    'Comprehensive full mock exam simulating real Bihar STET pattern with timed per-test countdown.',
    'mock_test',
    3600, -- 60 minutes
    NULL,
    1.00, 0.25,
    true, false, true, true,
    5, 'published'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.tests (
    id, exam_id, title, slug, description, test_type,
    duration_seconds, question_time_seconds, marks_per_question, negative_marks,
    shuffle_questions, shuffle_options, show_result_immediately, show_explanations,
    total_questions, status
  ) VALUES (
    v_test_practice,
    v_exam_id,
    'Operating Systems Rapid Practice',
    'os-rapid-practice',
    'Rapid-fire practice with per-question 30-second timer.',
    'practice',
    NULL,
    30, -- 30 seconds per question
    1.00, 0.25,
    true, false, true, true,
    5, 'published'
  ) ON CONFLICT (id) DO NOTHING;

  -- 10. Link Test Questions
  INSERT INTO public.test_questions (test_id, question_id, question_order)
  VALUES
    (v_test_mock, v_q1, 1),
    (v_test_mock, v_q2, 2),
    (v_test_mock, v_q3, 3),
    (v_test_mock, v_q4, 4),
    (v_test_mock, v_q5, 5),
    (v_test_practice, v_q1, 1),
    (v_test_practice, v_q2, 2),
    (v_test_practice, v_q3, 3),
    (v_test_practice, v_q4, 4),
    (v_test_practice, v_q5, 5)
  ON CONFLICT (test_id, question_id) DO NOTHING;

END $$;
