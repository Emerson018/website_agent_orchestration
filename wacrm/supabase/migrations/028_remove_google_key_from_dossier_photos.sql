-- ============================================================
-- 028 — Remove the Google API key from saved dossier photo links.
--
-- Photo links used to be saved with `key=...`, and the browser reads
-- `contacts.additional_data` directly, so the key reached every
-- signed-in user. The portal backend now adds the key on the server
-- when it fetches a photo. This cleans the links already saved.
-- ============================================================

UPDATE contacts c
SET additional_data = jsonb_set(
  c.additional_data,
  '{dossie,fotos}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN jsonb_typeof(foto.value -> 'photo_url') = 'string' THEN jsonb_set(
          foto.value,
          '{photo_url}',
          to_jsonb(
            regexp_replace(
              regexp_replace(foto.value ->> 'photo_url', '([?&])key=[^&]*&', '\1'),
              '[?&]key=[^&]*$',
              ''
            )
          )
        )
        ELSE foto.value
      END
      ORDER BY foto.ordinality
    )
    FROM jsonb_array_elements(c.additional_data #> '{dossie,fotos}') WITH ORDINALITY AS foto(value, ordinality)
  )
)
WHERE jsonb_typeof(c.additional_data #> '{dossie,fotos}') = 'array'
  AND jsonb_array_length(c.additional_data #> '{dossie,fotos}') > 0
  AND c.additional_data #>> '{dossie,fotos}' LIKE '%key=%';
