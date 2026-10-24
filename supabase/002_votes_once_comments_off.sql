-- Applied 24 Oct 2026. Comments off; one vote per story per guest.
drop policy if exists "write own vote or take" on public.docs;
drop policy if exists "update own vote or take" on public.docs;
create policy "write own votes" on public.docs
  for insert to authenticated
  with check (collection = 'votes' and id = (select auth.uid())::text);
create policy "update own votes" on public.docs
  for update to authenticated
  using (collection = 'votes' and id = (select auth.uid())::text)
  with check (collection = 'votes' and id = (select auth.uid())::text);

-- Once a story vote, poll answer or prediction is recorded, later changes are ignored.
create or replace function public.lock_votes()
returns trigger language plpgsql set search_path = '' as $$
declare f text; k text; oldv jsonb;
begin
  if new.collection <> 'votes' then return new; end if;
  foreach f in array array['post', 'poll', 'pred', 'quiz'] loop
    if jsonb_typeof(old.data -> f) = 'object' then
      if jsonb_typeof(new.data -> f) is distinct from 'object' then
        new.data := jsonb_set(new.data, array[f], '{}'::jsonb, true);
      end if;
      for k in select jsonb_object_keys(old.data -> f) loop
        oldv := old.data -> f -> k;
        if oldv is not null and oldv <> 'null'::jsonb and oldv <> '0'::jsonb
           and (new.data -> f -> k) is distinct from oldv then
          new.data := jsonb_set(new.data, array[f, k], oldv, true);
        end if;
      end loop;
    end if;
  end loop;
  return new;
end; $$;
drop trigger if exists lock_votes on public.docs;
create trigger lock_votes before update on public.docs
  for each row execute function public.lock_votes();
