Security note:
- RLS policies above assume auth.role() returns lowercase role names like 'admin', 'head', 'masteradmin'.
- In this project's frontend we use roles like 'ADMIN', 'HEAD', 'MASTERADMIN'. Adjust the SQL policies to match the actual values returned by auth if needed.

If you want, I can update the SQL to use comparisons that are case-insensitive or to check auth.uid() membership in a role mapping table.
