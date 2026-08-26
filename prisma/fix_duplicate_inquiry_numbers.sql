WITH ranked AS (
  SELECT
    inquiry_id,
    inquiry_no,
    ROW_NUMBER() OVER (
      PARTITION BY inquiry_no
      ORDER BY created_dt NULLS LAST, inquiry_id
    ) AS duplicate_rank
  FROM inquiry
  WHERE inquiry_no IS NOT NULL
),
duplicates AS (
  SELECT
    inquiry_id,
    ROW_NUMBER() OVER (ORDER BY inquiry_no, inquiry_id) AS reassignment_offset
  FROM ranked
  WHERE duplicate_rank > 1
),
current_max AS (
  SELECT COALESCE(MAX((regexp_match(inquiry_no, '([0-9]+)$'))[1]::int), 0) AS max_inquiry_number
  FROM inquiry
  WHERE inquiry_no ~ '[0-9]+$'
)
UPDATE inquiry AS target
SET inquiry_no = 'Inquiry/' || (current_max.max_inquiry_number + duplicates.reassignment_offset)::text
FROM duplicates
CROSS JOIN current_max
WHERE target.inquiry_id = duplicates.inquiry_id;
