begin;
set local role authenticated;
create temp table _kairoos_test_results (
  step text,
  outcome text,
  details text
) on commit drop;

select 1;
rollback;