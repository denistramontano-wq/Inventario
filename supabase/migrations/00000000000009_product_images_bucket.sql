insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Bucket pubblico in lettura (le foto prodotto sono condivise tra tutti,
-- come il catalogo prodotti stesso), scrittura solo per utenti autenticati.
create policy "public read product images"
on storage.objects for select
using (bucket_id = 'product-images');

create policy "authenticated users can upload product images"
on storage.objects for insert
with check (bucket_id = 'product-images' and (select auth.uid()) is not null);

create policy "authenticated users can update product images"
on storage.objects for update
using (bucket_id = 'product-images' and (select auth.uid()) is not null);
