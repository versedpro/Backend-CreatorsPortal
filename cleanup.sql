-- ONLY FOR RECORD KEEPING
-- STAGING DB CLEANING HAPPENED ON 23/09/2022
-- WE LEFT ONLY EMIRATES AND UGGS DATA
DELETE FROM public.api_secret_keys
	WHERE organization_id NOT IN ('0f9c6b5a-e1a4-4c09-87d5-82e4b1452668','04f34965-7ad1-4d1f-82f8-d17e0196afc7');

DELETE FROM public.organization_invites;

DELETE FROM public.organization_auths;

DELETE FROM public.password_resets;

DELETE FROM public.user_tokens;

DELETE FROM public.nft_items
	WHERE collection_id NOT IN (SELECT id FROM public.nft_collections
WHERE organization_id IN ('0f9c6b5a-e1a4-4c09-87d5-82e4b1452668','04f34965-7ad1-4d1f-82f8-d17e0196afc7'));

DELETE FROM public.first_party_question_answers
	WHERE collection_id NOT IN (SELECT id FROM public.nft_collections
WHERE organization_id IN ('0f9c6b5a-e1a4-4c09-87d5-82e4b1452668','04f34965-7ad1-4d1f-82f8-d17e0196afc7'));

DELETE FROM public.nft_collections
	WHERE organization_id NOT IN ('0f9c6b5a-e1a4-4c09-87d5-82e4b1452668','04f34965-7ad1-4d1f-82f8-d17e0196afc7');

DELETE FROM public.organizations
	WHERE id NOT IN ('0f9c6b5a-e1a4-4c09-87d5-82e4b1452668','04f34965-7ad1-4d1f-82f8-d17e0196afc7');
