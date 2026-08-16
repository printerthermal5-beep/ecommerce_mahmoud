-- ================================================
-- متجر النور - Supabase Database Setup
-- ================================================
-- Run this SQL in your Supabase SQL Editor:
-- https://baprrfxmkcithsnjolgs.supabase.co → SQL Editor → New Query

-- 1. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📦',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    discount_price NUMERIC,
    image_url TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    is_available BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number SERIAL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT,
    customer_notes TEXT,
    total_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled')),
    whatsapp_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL,
    total_price NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Store Settings Table
CREATE TABLE IF NOT EXISTS store_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_name TEXT DEFAULT 'متجر النور',
    store_logo TEXT,
    whatsapp_number TEXT DEFAULT '01222462607',
    delivery_fee NUMERIC DEFAULT 0,
    min_order NUMERIC DEFAULT 0,
    store_announcement TEXT,
    is_store_open BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings
INSERT INTO store_settings (store_name, whatsapp_number, delivery_fee)
VALUES ('متجر النور', '01222462607', 0);

-- ================================================
-- Row Level Security (RLS) Policies
-- ================================================

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Categories: public read, admin write
CREATE POLICY "Anyone can read active categories" ON categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can manage categories" ON categories
    FOR ALL USING (auth.role() = 'authenticated');

-- Products: public read, admin write
CREATE POLICY "Anyone can read available products" ON products
    FOR SELECT USING (is_available = true);

CREATE POLICY "Authenticated users can manage products" ON products
    FOR ALL USING (auth.role() = 'authenticated');

-- Orders: public insert, admin read/update
CREATE POLICY "Anyone can create orders" ON orders
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can read orders" ON orders
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update orders" ON orders
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Order Items: public insert, admin read
CREATE POLICY "Anyone can create order items" ON order_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can read order items" ON order_items
    FOR SELECT USING (auth.role() = 'authenticated');

-- Store Settings: public read, admin update
CREATE POLICY "Anyone can read store settings" ON store_settings
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can update settings" ON store_settings
    FOR UPDATE USING (auth.role() = 'authenticated');

-- ================================================
-- Create Storage Bucket for Product Images
-- ================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: public read, authenticated upload
CREATE POLICY "Public read product images" ON storage.objects
    FOR SELECT USING (bucket_id = 'products');

CREATE POLICY "Authenticated upload product images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete product images" ON storage.objects
    FOR DELETE USING (bucket_id = 'products' AND auth.role() = 'authenticated');

-- ================================================
-- Insert Sample Categories
-- ================================================
INSERT INTO categories (name, icon, sort_order) VALUES
    ('تحف وأنتيكات', '🏺', 1),
    ('فازات', '🏵️', 2),
    ('شموع وحاملات', '🕯️', 3),
    ('ساعات حائط', '🕐', 4),
    ('إطارات صور', '🖼️', 5),
    ('ديكورات منزلية', '🏠', 6);
