-- Delete 30 legacy services (tuss_code = null, specific IDs)
-- This script handles foreign key constraints by deleting dependent records first

-- Step 1: Delete appointments that reference any of these 30 services
DELETE FROM appointments 
WHERE service_id IN (
  '9b1f1140-ce04-4637-94da-267ff9191ae8',
  'c08968d7-fbda-4924-afff-c60e6b7a4074',
  '57b639f8-4aa3-4815-aee2-f2ed0669cc2a',
  '8ab8acbc-c6e5-44aa-90ef-427e8c4dd84b',
  '8842fe1f-e517-4eef-be95-560413f0798c',
  '10ab0e42-d4a9-4e52-a46b-08e07b24b90a',
  'a22c3ea4-f6b8-4c90-8621-050e399f40c5',
  'a09689b8-857a-4e2b-be60-aabb0655adaf',
  'cab0caf5-f1f5-4db0-bb11-e32f6005aea7',
  '77326911-92f8-4dfd-b5ee-e554ff3c9de5',
  'a2089e92-1cc1-401d-8024-8432ce49d899',
  'ebb51cfa-9577-4cbe-9ce0-48f322cb97fb',
  '87f1430c-84db-41f6-8f9d-a8372a520f1c',
  '1677d100-015e-4138-9627-738ca3a5eda6',
  '7a5dac75-48c6-45cd-b350-a83cf558a299',
  'bba3ca0d-4bf5-4dbb-9370-25e8eb32db0b',
  '4bf871b1-b51e-4c19-890b-bd6b08f84096',
  'e6cb1e21-c8c6-4534-b37e-6cc2dc102a2a',
  'aee25265-9109-483a-9c33-6a061eed889e',
  '02216898-81e2-4550-8ed2-708447ad710a',
  'a02f45fe-3143-4f9c-b869-570facd705e6',
  '2fd69958-852c-4959-af58-686720155aa8',
  '87e7c6e0-926d-4426-8118-7446f424b624',
  '083c77f6-6e14-4d8c-b207-1e6a726b7f7d',
  'a73df1b1-5ac9-4aa7-a098-9c11c2ef9c9c',
  '1fb3d96d-d531-406d-93c3-fb236c79998d',
  'fd262828-668f-42e4-9f55-4d550f380a54',
  '1b73a4b5-7f49-4078-ae12-d6853697eea6',
  '2c754375-8033-43be-ab9d-939a6dff3e71',
  '3c7870d0-4fe1-4163-a8f8-46017847525c'
);

-- Step 2: Delete orphaned appointment audit logs
DELETE FROM appointment_audit_logs 
WHERE appointment_id NOT IN (SELECT id FROM appointments);

-- Step 3: Delete the 30 services
DELETE FROM services 
WHERE id IN (
  '9b1f1140-ce04-4637-94da-267ff9191ae8',
  'c08968d7-fbda-4924-afff-c60e6b7a4074',
  '57b639f8-4aa3-4815-aee2-f2ed0669cc2a',
  '8ab8acbc-c6e5-44aa-90ef-427e8c4dd84b',
  '8842fe1f-e517-4eef-be95-560413f0798c',
  '10ab0e42-d4a9-4e52-a46b-08e07b24b90a',
  'a22c3ea4-f6b8-4c90-8621-050e399f40c5',
  'a09689b8-857a-4e2b-be60-aabb0655adaf',
  'cab0caf5-f1f5-4db0-bb11-e32f6005aea7',
  '77326911-92f8-4dfd-b5ee-e554ff3c9de5',
  'a2089e92-1cc1-401d-8024-8432ce49d899',
  'ebb51cfa-9577-4cbe-9ce0-48f322cb97fb',
  '87f1430c-84db-41f6-8f9d-a8372a520f1c',
  '1677d100-015e-4138-9627-738ca3a5eda6',
  '7a5dac75-48c6-45cd-b350-a83cf558a299',
  'bba3ca0d-4bf5-4dbb-9370-25e8eb32db0b',
  '4bf871b1-b51e-4c19-890b-bd6b08f84096',
  'e6cb1e21-c8c6-4534-b37e-6cc2dc102a2a',
  'aee25265-9109-483a-9c33-6a061eed889e',
  '02216898-81e2-4550-8ed2-708447ad710a',
  'a02f45fe-3143-4f9c-b869-570facd705e6',
  '2fd69958-852c-4959-af58-686720155aa8',
  '87e7c6e0-926d-4426-8118-7446f424b624',
  '083c77f6-6e14-4d8c-b207-1e6a726b7f7d',
  'a73df1b1-5ac9-4aa7-a098-9c11c2ef9c9c',
  '1fb3d96d-d531-406d-93c3-fb236c79998d',
  'fd262828-668f-42e4-9f55-4d550f380a54',
  '1b73a4b5-7f49-4078-ae12-d6853697eea6',
  '2c754375-8033-43be-ab9d-939a6dff3e71',
  '3c7870d0-4fe1-4163-a8f8-46017847525c'
);

-- Optional: Verify deletion
-- SELECT COUNT(*) FROM services WHERE id IN (...);  -- Should return 0
