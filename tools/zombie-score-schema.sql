-- Additive, Zombie-only schema on the existing Siempre Neon database.
-- Runtime has no schema creation, deletion, or existing game table grants.
CREATE SCHEMA siempre_zombie;
REVOKE ALL ON SCHEMA siempre_zombie FROM PUBLIC;
CREATE TABLE siempre_zombie.leaderboard_states (
  path text PRIMARY KEY CHECK(length(path)<=160),
  state jsonb NOT NULL,
  version bigint NOT NULL DEFAULT 1
);
REVOKE ALL ON TABLE siempre_zombie.leaderboard_states FROM PUBLIC;
GRANT USAGE ON SCHEMA siempre_zombie TO siempre_zombie_runtime;
GRANT SELECT,INSERT,UPDATE ON TABLE siempre_zombie.leaderboard_states TO siempre_zombie_runtime;
