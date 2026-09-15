-- =========================================================================
-- CLICKIIT.CO - COMPLETE SUPABASE DATABASE & STORAGE SETUP
-- =========================================================================
-- Instructions:
-- 1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/gqcynoumwixuriguwtjz
-- 2. Click "SQL Editor" in the left sidebar.
-- 3. Click "New Query", paste ALL of the code below, and click "RUN" (green button).
-- 4. That's it! Your bookings, photo strips, and storage bucket are fully initialized!
-- =========================================================================

-- 1. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.bookings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  whatsapp TEXT,
  address TEXT,
  "eventDate" TEXT NOT NULL,
  "eventTime" TEXT DEFAULT '18:00',
  "eventType" TEXT,
  "sessionPlan" TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- 2. PHOTO STRIPS TABLE (Scrapbook CMS)
CREATE TABLE IF NOT EXISTS public.strips (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  "dateTag" TEXT,
  "imageUrl" TEXT NOT NULL,
  "displayTarget" TEXT DEFAULT 'both',
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strips ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES FOR BOOKINGS TABLE
DROP POLICY IF EXISTS "Allow public read bookings" ON public.bookings;
CREATE POLICY "Allow public read bookings" ON public.bookings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert bookings" ON public.bookings;
CREATE POLICY "Allow public insert bookings" ON public.bookings
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update bookings" ON public.bookings;
CREATE POLICY "Allow update bookings" ON public.bookings
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete bookings" ON public.bookings;
CREATE POLICY "Allow delete bookings" ON public.bookings
  FOR DELETE USING (true);

-- 5. POLICIES FOR STRIPS TABLE
DROP POLICY IF EXISTS "Allow public read strips" ON public.strips;
CREATE POLICY "Allow public read strips" ON public.strips
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert strips" ON public.strips;
CREATE POLICY "Allow public insert strips" ON public.strips
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update strips" ON public.strips;
CREATE POLICY "Allow public update strips" ON public.strips
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete strips" ON public.strips;
CREATE POLICY "Allow public delete strips" ON public.strips
  FOR DELETE USING (true);

-- 6. STORAGE BUCKET FOR PHOTO STRIP IMAGES
INSERT INTO storage.buckets (id, name, public)
VALUES ('strips', 'strips', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage bucket access policies
DROP POLICY IF EXISTS "Public Read Strips Storage" ON storage.objects;
CREATE POLICY "Public Read Strips Storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'strips');

DROP POLICY IF EXISTS "Public Upload Strips Storage" ON storage.objects;
CREATE POLICY "Public Upload Strips Storage"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'strips');

DROP POLICY IF EXISTS "Public Update Strips Storage" ON storage.objects;
CREATE POLICY "Public Update Strips Storage"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'strips');

DROP POLICY IF EXISTS "Public Delete Strips Storage" ON storage.objects;
CREATE POLICY "Public Delete Strips Storage"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'strips');

-- 7. MIGRATE EXISTING BOOKING FROM LOCAL DATA
INSERT INTO public.bookings (id, name, whatsapp, address, "eventDate", "eventTime", "eventType", "sessionPlan", notes, status, "createdAt")
VALUES ('BK-685209', 'Madhur', '9518597366', 'NGP', '2026-09-16', '18:00', 'Brand Event', 'Classic — 200 Prints (₹12,999)', '', 'confirmed', '2026-09-14T21:01:25.210Z')
ON CONFLICT (id) DO NOTHING;
