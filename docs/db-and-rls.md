# DB · RLS

**이 문서의 목적: Claude Code가 컬럼 이름을 추측하지 못하게 하는 것.**

로드맵은 "무엇을 저장할지"를 정하고, 이 문서는 "지금 DB에 실제로 뭐가 있는지"를 적는다.
§2가 비어 있으면 **스키마를 짐작해서 코드를 쓰지 말고 먼저 채운다.**

---

## 1. 문서상 확정된 것

**테이블 5개** — `campuses` `profiles` `cats` `sightings` `feedings`
`zones`는 폐기. 다시 만들지 않는다.

| 테이블 | 문서에 적힌 것 |
|---|---|
| `campuses` | `status` = `hidden` / `open` |
| `profiles` | `id` · `campus_id`(v1은 NULL) · `nickname` · `role` · `created_at` · `onboarded_at` |
| `cats` | 이름 · 성별 · 특이사항 · 중성화 여부 · 대표사진. **건강상태 컬럼 없음** (로드맵 §2.7-3) |
| `sightings` | `lat` `lng`(50m 라운딩) · `cat_id` · `created_at` · `deleted_at` · `reporter_id` · `photo_path` |
| `feedings` | `cats` FK. **위치 컬럼 없음.** `kind` = 밥/간식/물 (로드맵 §2.8-15) |

**트리거** — `auth.users` INSERT 시 `handle_new_user()` 실행 → `public.random_nickname()` 호출.
`raw_user_meta_data`를 건드리지 않으므로 카카오 가입에도 안전하다.

**Storage 버킷 2개** — `cat-covers`(공개) / `cat-photos`(비공개, 10분 서명 URL)

**`.env`** — `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY` (신규 publishable key 형식)

**미적용 스키마 변경 (2026-07-21 기준)**
- `feedings.kind` 추가 — 7/20 확인 시점에 없었다. 값은 밥/간식/물

---

## 2. 실물 스냅샷 — 비어 있음. 채우고 시작할 것

Supabase SQL Editor에서 아래를 돌리고 결과를 그대로 붙여넣는다.
**컬럼 이름·타입·NULL 허용 여부는 여기 적힌 것만 사실로 취급한다.**

### 2-1. 컬럼

```sql
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;
```

```
| table_name | column_name     | data_type                | is_nullable | column_default    |
| ---------- | --------------- | ------------------------ | ----------- | ----------------- |
| campuses   | id              | uuid                     | NO          | gen_random_uuid() |
| campuses   | slug            | text                     | NO          | null              |
| campuses   | name            | text                     | NO          | null              |
| campuses   | center_lat      | double precision         | NO          | null              |
| campuses   | center_lng      | double precision         | NO          | null              |
| campuses   | status          | text                     | NO          | 'hidden'::text    |
| campuses   | created_at      | timestamp with time zone | NO          | now()             |
| cats       | id              | uuid                     | NO          | gen_random_uuid() |
| cats       | campus_id       | uuid                     | NO          | null              |
| cats       | code            | text                     | YES         | null              |
| cats       | name            | text                     | NO          | null              |
| cats       | sex             | text                     | NO          | 'unknown'::text   |
| cats       | neutered        | boolean                  | YES         | null              |
| cats       | traits          | ARRAY                    | NO          | '{}'::text[]      |
| cats       | description     | text                     | YES         | null              |
| cats       | cover_path      | text                     | YES         | null              |
| cats       | status          | text                     | NO          | 'active'::text    |
| cats       | created_by      | uuid                     | YES         | null              |
| cats       | created_at      | timestamp with time zone | NO          | now()             |
| cats_full  | id              | uuid                     | YES         | null              |
| cats_full  | campus_id       | uuid                     | YES         | null              |
| cats_full  | code            | text                     | YES         | null              |
| cats_full  | name            | text                     | YES         | null              |
| cats_full  | sex             | text                     | YES         | null              |
| cats_full  | neutered        | boolean                  | YES         | null              |
| cats_full  | traits          | ARRAY                    | YES         | null              |
| cats_full  | description     | text                     | YES         | null              |
| cats_full  | cover_path      | text                     | YES         | null              |
| cats_full  | status          | text                     | YES         | null              |
| cats_full  | created_by      | uuid                     | YES         | null              |
| cats_full  | created_at      | timestamp with time zone | YES         | null              |
| cats_full  | last_lat        | double precision         | YES         | null              |
| cats_full  | last_lng        | double precision         | YES         | null              |
| cats_full  | last_sighted_at | timestamp with time zone | YES         | null              |
| cats_full  | last_fed_at     | timestamp with time zone | YES         | null              |
| cats_full  | last_fed_kind   | text                     | YES         | null              |
| cats_guest | id              | uuid                     | YES         | null              |
| cats_guest | campus_id       | uuid                     | YES         | null              |
| cats_guest | name            | text                     | YES         | null              |
| cats_guest | cover_path      | text                     | YES         | null              |
| cats_guest | traits          | ARRAY                    | YES         | null              |
| cats_guest | last_lat        | double precision         | YES         | null              |
| cats_guest | last_lng        | double precision         | YES         | null              |
| cats_guest | last_fed_at     | timestamp with time zone | YES         | null              |
| cats_guest | last_fed_kind   | text                     | YES         | null              |
| feedings   | id              | uuid                     | NO          | gen_random_uuid() |
| feedings   | cat_id          | uuid                     | NO          | null              |
| feedings   | giver_id        | uuid                     | YES         | null              |
| feedings   | kind            | text                     | NO          | 'food'::text      |
| feedings   | fed_at          | timestamp with time zone | NO          | now()             |
| feedings   | deleted_at      | timestamp with time zone | YES         | null              |
| feedings   | created_at      | timestamp with time zone | NO          | now()             |
| profiles   | id              | uuid                     | NO          | null              |
| profiles   | campus_id       | uuid                     | YES         | null              |
| profiles   | nickname        | text                     | NO          | null              |
| profiles   | role            | text                     | NO          | 'user'::text      |
| profiles   | created_at      | timestamp with time zone | NO          | now()             |
| profiles   | onboarded_at    | timestamp with time zone | YES         | null              |
| sightings  | id              | uuid                     | NO          | gen_random_uuid() |
| sightings  | cat_id          | uuid                     | NO          | null              |
| sightings  | lat             | double precision         | NO          | null              |
| sightings  | lng             | double precision         | NO          | null              |
| sightings  | reporter_id     | uuid                     | YES         | null              |
| sightings  | photo_path      | text                     | YES         | null              |
| sightings  | deleted_at      | timestamp with time zone | YES         | null              |
| sightings  | created_at      | timestamp with time zone | NO          | now()             |
```

### 2-2. RLS 켜짐 여부

```sql
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r';
```

```
[
  {
    "relname": "feedings",
    "relrowsecurity": true
  },
  {
    "relname": "campuses",
    "relrowsecurity": true
  },
  {
    "relname": "profiles",
    "relrowsecurity": true
  },
  {
    "relname": "cats",
    "relrowsecurity": true
  },
  {
    "relname": "sightings",
    "relrowsecurity": true
  }
]
```

### 2-3. 정책 — `qual`이 정책의 실제 조건식이다

```sql
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

```
[
  {
    "tablename": "campuses",
    "policyname": "campuses_select",
    "cmd": "SELECT",
    "roles": "{public}",
    "qual": "((status = 'open'::text) OR is_staff())",
    "with_check": null
  },
  {
    "tablename": "cats",
    "policyname": "cats_select_authed",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "((status = 'active'::text) OR is_staff())",
    "with_check": null
  },
  {
    "tablename": "cats",
    "policyname": "cats_write_authed",
    "cmd": "ALL",
    "roles": "{authenticated}",
    "qual": "true",
    "with_check": "true"
  },
  {
    "tablename": "feedings",
    "policyname": "feedings_insert",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(giver_id = auth.uid())"
  },
  {
    "tablename": "feedings",
    "policyname": "feedings_moderate",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "is_staff()",
    "with_check": "is_staff()"
  },
  {
    "tablename": "feedings",
    "policyname": "feedings_select_authed",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "((deleted_at IS NULL) OR is_staff())",
    "with_check": null
  },
  {
    "tablename": "profiles",
    "policyname": "profiles_select_self",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "((id = auth.uid()) OR is_staff())",
    "with_check": null
  },
  {
    "tablename": "profiles",
    "policyname": "profiles_update_self",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(id = auth.uid())",
    "with_check": "(id = auth.uid())"
  },
  {
    "tablename": "sightings",
    "policyname": "sightings_insert",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(reporter_id = auth.uid())"
  },
  {
    "tablename": "sightings",
    "policyname": "sightings_moderate",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "is_staff()",
    "with_check": "is_staff()"
  },
  {
    "tablename": "sightings",
    "policyname": "sightings_select_authed",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(((deleted_at IS NULL) AND (created_at <= (now() - sighting_delay()))) OR is_staff())",
    "with_check": null
  }
]
```

### 2-4. 버킷

```sql
select id, name, public from storage.buckets;
```

```
[
  {
    "id": "cat-covers",
    "name": "cat-covers",
    "public": true
  },
  {
    "id": "cat-photos",
    "name": "cat-photos",
    "public": false
  }
]
```

### 2-5. 트리거 · 함수

```sql
select t.tgname, pg_get_functiondef(p.oid)
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where not t.tgisinternal;
```

```
[
  {
    "tgname": "update_objects_updated_at",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.update_updated_at_column()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    NEW.updated_at = now();\n    RETURN NEW; \nEND;\n$function$\n"
  },
  {
    "tgname": "enforce_bucket_name_length_trigger",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.enforce_bucket_name_length()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nbegin\n    if length(new.name) > 100 then\n        raise exception 'bucket name \"%\" is too long (% characters). Max is 100.', new.name, length(new.name);\n    end if;\n    return new;\nend;\n$function$\n"
  },
  {
    "tgname": "protect_buckets_delete",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.protect_delete()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    -- Check if storage.allow_delete_query is set to 'true'\n    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN\n        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'\n            USING HINT = 'This prevents accidental data loss from orphaned objects.',\n                  ERRCODE = '42501';\n    END IF;\n    RETURN NULL;\nEND;\n$function$\n"
  },
  {
    "tgname": "protect_objects_delete",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.protect_delete()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    -- Check if storage.allow_delete_query is set to 'true'\n    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN\n        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'\n            USING HINT = 'This prevents accidental data loss from orphaned objects.',\n                  ERRCODE = '42501';\n    END IF;\n    RETURN NULL;\nEND;\n$function$\n"
  },
  {
    "tgname": "tr_check_filters",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION realtime.subscription_check_filters()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\ndeclare\n    col_names text[] = coalesce(\n            array_agg(a.attname order by a.attnum),\n            '{}'::text[]\n        )\n        from\n            pg_catalog.pg_attribute a\n        where\n            a.attrelid = new.entity\n            and a.attnum > 0\n            and not a.attisdropped\n            and pg_catalog.has_column_privilege(\n                (new.claims ->> 'role'),\n                a.attrelid,\n                a.attnum,\n                'SELECT'\n            );\n    filter realtime.user_defined_filter;\n    col_type regtype;\n    in_val jsonb;\n    selected_col text;\nbegin\n    for filter in select * from unnest(new.filters) loop\n        if not filter.column_name = any(col_names) then\n            raise exception 'invalid column for filter %', filter.column_name;\n        end if;\n\n        col_type = (\n            select atttypid::regtype\n            from pg_catalog.pg_attribute\n            where attrelid = new.entity\n                  and attname = filter.column_name\n        );\n        if col_type is null then\n            raise exception 'failed to lookup type for column %', filter.column_name;\n        end if;\n\n        if filter.op = 'in'::realtime.equality_op then\n            in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);\n            if coalesce(jsonb_array_length(in_val), 0) > 100 then\n                raise exception 'too many values for `in` filter. Maximum 100';\n            end if;\n        elsif filter.op = 'is'::realtime.equality_op then\n            -- `is` requires a keyword RHS rather than a typed literal\n            if filter.value not in ('null', 'true', 'false', 'unknown') then\n                raise exception 'invalid value for is filter: must be null, true, false, or unknown';\n            end if;\n            -- IS NULL works for any type, but IS TRUE/FALSE/UNKNOWN require a boolean\n            -- operand. Reject the non-null keywords on non-boolean columns here so they\n            -- don't abort apply_rls at WAL time.\n            if filter.value <> 'null' and col_type <> 'boolean'::regtype then\n                raise exception 'is % filter requires a boolean column, got %', filter.value, col_type::text;\n            end if;\n        elsif filter.op in ('like'::realtime.equality_op, 'ilike'::realtime.equality_op) then\n            -- like/ilike apply the text pattern operator (~~); reject column types that\n            -- have no such operator instead of failing at WAL time\n            if not exists (\n                select 1 from pg_catalog.pg_operator\n                where oprname = '~~' and oprleft = col_type\n            ) then\n                raise exception 'operator % requires a text-compatible column type, got %', filter.op::text, col_type::text;\n            end if;\n        elsif filter.op in ('match'::realtime.equality_op, 'imatch'::realtime.equality_op) then\n            -- match/imatch apply the regex operators ~ / ~*; reject column types that have\n            -- no such operator (e.g. integer) instead of failing at WAL time, mirroring the\n            -- like/ilike guard above.\n            if not exists (\n                select 1 from pg_catalog.pg_operator\n                where oprname = case when filter.op = 'imatch'::realtime.equality_op then '~*' else '~' end\n                  and oprleft = col_type\n                  and oprright = col_type\n                  and oprresult = 'boolean'::regtype\n            ) then\n                raise exception 'operator % requires a text-compatible column type, got %', filter.op::text, col_type::text;\n            end if;\n            -- validate the regex eagerly so a bad pattern is rejected here, not inside\n            -- apply_rls where it would abort the WAL stream for the entity\n            begin\n                perform '' ~ filter.value;\n            exception when others then\n                raise exception 'invalid regular expression for % filter: %', filter.op::text, sqlerrm;\n            end;\n        else\n            -- eq/neq/lt/lte/gt/gte: value must be coercable to the type\n            perform realtime.cast(filter.value, col_type);\n        end if;\n    end loop;\n\n    if new.selected_columns is not null then\n        for selected_col in select * from unnest(new.selected_columns) loop\n            if not selected_col = any(col_names) then\n                raise exception 'invalid column for select %', selected_col;\n            end if;\n        end loop;\n    end if;\n\n    -- Apply consistent order to filters so the unique constraint can't be tricked by a\n    -- different filter order. negate is part of the sort key.\n    new.filters = coalesce(\n        array_agg(f order by f.column_name, f.op, f.value, f.negate),\n        '{}'\n    ) from unnest(new.filters) f;\n\n    new.selected_columns = (\n        select array_agg(c order by c)\n        from unnest(new.selected_columns) c\n    );\n\n    return new;\nend;\n$function$\n"
  },
  {
    "tgname": "on_auth_user_created",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.handle_new_user()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\r\nbegin\r\n  insert into public.profiles (id, nickname, role, created_at)\r\n  values (new.id, public.random_nickname(), 'user', now())\r\n  on conflict (id) do nothing;\r\n  return new;\r\nend;\r\n$function$\n"
  }
] 
```

---

## 3. 설계 전제

**게스트 제한은 화면 레벨이다** (로드맵 §2.8-11).
anon에게 `cats` SELECT를 직접 연다. 게스트 전용 뷰/RPC는 만들지 않는다.
성별·중성화·전체 목록이 API로 나가는 걸 감수한 결정이다.

**단 하나 예외 — 1시간 지연은 데이터 레벨이다.**
비협상 규칙이라 화면에서 처리하지 않는다. `sightings` SELECT 정책에 조건식으로 들어간다.
**본인이 올린 목격은 본인에게 즉시 보인다.** 근거는 로드맵 Phase E의 안내 문구 — "**다른 사람에게는** 약 1시간 뒤부터 보여요". 본인까지 가리면 목격 등록 직후 화면에 아무 일도 안 일어난다.

**soft-delete** — 모든 SELECT 정책에 `deleted_at is null`이 들어간다.

---

## 4. 정책 명세 — 이대로 짜면 된다

**미결 사항 없음.** 2026-07-21에 §3-11 · §3-12 · §3-14가 전부 닫혔다.

### 테이블

| 테이블 | anon SELECT | authenticated SELECT | INSERT | UPDATE / DELETE |
|---|---|---|---|---|
| `campuses` | `status = 'open'` | 동일 | ✕ | ✕ |
| `cats` | `deleted_at is null` | 동일 | 로그인 누구나 | 로그인 누구나 (v1) |
| `sightings` | `deleted_at is null` **AND 1시간 경과** | `deleted_at is null` AND (1시간 경과 **OR** `reporter_id = auth.uid()`) | 로그인. `reporter_id = auth.uid()` 강제 | 본인 행만 |
| `feedings` | `deleted_at is null` (지연 없음) | 동일 | 로그인. 본인 id 강제 | 본인 행만 |
| `profiles` | **✕ (전면 차단)** | **전체 행 허용** | 트리거가 생성 | 본인 행만 |

- `cats` UPDATE를 로그인 누구나로 두는 건 "정보 업데이트"가 공동 편집 전제이기 때문이다. 악용 대응은 Phase F(신고·soft-delete·`role`)에서 붙인다
- `sightings` INSERT의 `reporter_id = auth.uid()` 강제는 `with_check`로 건다
- `profiles`를 anon에 차단하는 이유 — 게스트 카드에 닉네임이 없어서 열 이유가 없다

### Storage

| 버킷 | 읽기 | 쓰기 |
|---|---|---|
| `cat-covers` | 누구나 (공개 버킷) | 로그인 |
| `cat-photos` | 로그인 (서명 URL 10분) | 로그인 |

`sightings.photo_path` 문자열이 anon에게 노출되지만 버킷이 비공개라 서명 URL 없이는 못 연다.

---

## 5. Phase B 남은 순서

1. §2 스냅샷 채우기
2. `feedings.kind` 컬럼 추가
3. 카카오 `account_email` 동의항목 설정 → 로그인 성공 확인
4. **중복 계정 테스트** — 같은 주소로 이메일 가입 + 카카오 로그인 → `select id, email from auth.users` 개수 확인. 2개면 안내 문구 필요
5. §4 명세대로 RLS 정책 작성
6. Storage 버킷 2개 + 정책
7. 검증 — **anon 키로 API를 직접 때려서 확인한다.**
   확인할 것은 두 가지뿐이다. `sightings`가 1시간 지연을 지키는가, `profiles`가 막혀 있는가.
   나머지(`cats` 전체 조회 등)는 열려 있는 게 정상이다