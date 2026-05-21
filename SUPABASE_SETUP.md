# 줍줍노트 Supabase 저장소 설정

CSV는 백업/내보내기용으로 두고, 실제 데이터는 Supabase 무료 프로젝트에 저장합니다.

## 1. 프로젝트 만들기

1. Supabase에서 새 프로젝트를 만듭니다.
2. `Project Settings > API`에서 아래 값을 복사합니다.
   - Project URL
   - `anon public` key
3. `Authentication > Users`에서 본인 계정을 하나 만듭니다.

## 2. SQL 실행

Supabase의 `SQL Editor`에서 아래 SQL을 실행합니다.

```sql
create table if not exists public.zzup_clips (
  id text primary key,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  content_type text not null default '링크',
  sentence text not null default '',
  reason text not null default '',
  connection text not null default '',
  use_for text not null default '정리필요',
  action text not null default '정리필요',
  source text not null default '',
  site_name text not null default '',
  icon_url text not null default '',
  image_path text not null default '',
  image_url text not null default '',
  title text not null default '',
  tags text[] not null default '{}',
  status text not null default '새로 수집',
  favorite boolean not null default false,
  review_count integer not null default 0,
  last_reviewed timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.zzup_clips enable row level security;

drop policy if exists "read own clips" on public.zzup_clips;
drop policy if exists "insert own clips" on public.zzup_clips;
drop policy if exists "update own clips" on public.zzup_clips;
drop policy if exists "delete own clips" on public.zzup_clips;

create policy "read own clips"
on public.zzup_clips for select
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

create policy "insert own clips"
on public.zzup_clips for insert
to authenticated
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "update own clips"
on public.zzup_clips for update
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "delete own clips"
on public.zzup_clips for delete
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('zzup-images', 'zzup-images', true)
on conflict (id) do nothing;

drop policy if exists "upload own images" on storage.objects;
drop policy if exists "read public zzup images" on storage.objects;

create policy "upload own images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'zzup-images');

create policy "read public zzup images"
on storage.objects for select
to public
using (bucket_id = 'zzup-images');
```

## 3. 줍줍노트에 연결

1. 웹홈 또는 모바일 줍기 페이지를 엽니다.
2. `Supabase URL`, `anon public key`, 이메일, 비밀번호를 입력합니다.
3. `설정 저장`을 누른 뒤 `로그인`을 누릅니다.
4. 기존 CSV가 있다면 웹홈에서 CSV를 연 뒤 `현재 항목 올리기`를 누릅니다.

## 4. 쓰는 방식

- 모바일에서 저장하면 Supabase에도 바로 저장됩니다.
- 웹홈을 열면 Supabase 데이터를 불러와서 카드뷰에 합칩니다.
- 줍줍문장은 Supabase에서 `문장` 유형만 불러오고, 새 문장/이유 수정도 DB에 저장합니다.
- 줍줍사진은 Supabase에서 이미지 기록과 Storage URL을 불러와 사진 보드로 보여줍니다.
- CSV 저장/문장만 CSV/정리 완료 제외 CSV는 백업과 외부 이동용으로 계속 쓸 수 있습니다.

## 참고

`zzup-images` 버킷은 이미지 미리보기가 쉽게 보이도록 public 버킷으로 만듭니다. 민감한 이미지를 저장해야 한다면 private 버킷과 signed URL 방식으로 바꾸는 것이 좋습니다.
