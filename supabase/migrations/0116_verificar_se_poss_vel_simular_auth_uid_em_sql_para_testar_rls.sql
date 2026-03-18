begin;
select auth.uid() as before_uid;
select set_config('request.jwt.claim.sub', 'ffdf5772-7445-420e-9c99-13f291964d08', true);
select auth.uid() as after_uid;
rollback;