-- Fix the check_pick_timing trigger to allow scoring updates
-- The trigger should block user field changes (picked_team, is_lock, user_id, game_id)
-- but ALLOW system scoring field updates (pick_points, bonus_points, solo_pick, solo_lock, super_bonus)

DROP FUNCTION IF EXISTS check_pick_timing() CASCADE;

CREATE OR REPLACE FUNCTION check_pick_timing()
RETURNS TRIGGER AS $$
DECLARE
  game_time TIMESTAMPTZ;
  game_status TEXT;
  game_home TEXT;
  game_away TEXT;
BEGIN
  -- Get game details
  SELECT g.game_time, g.status, g.home_team, g.away_team 
  INTO game_time, game_status, game_home, game_away
  FROM games g WHERE g.id = NEW.game_id;
  
  -- Check if this is a scoring-only update (system fields only)
  -- Allow updates to: pick_points, bonus_points, solo_pick, solo_lock, super_bonus
  -- These are the fields updated by updateSoloPickStatus()
  IF TG_OP = 'UPDATE' THEN
    -- Check if only scoring fields are being updated
    IF (OLD.user_id = NEW.user_id AND 
        OLD.game_id = NEW.game_id AND
        OLD.picked_team = NEW.picked_team AND
        OLD.is_lock = NEW.is_lock) THEN
      -- This is a scoring-only update, allow it
      RETURN NEW;
    END IF;
  END IF;
  
  -- For INSERT or UPDATE of user-changeable fields, enforce timing rules
  -- Prevent picks/updates after game has started or is not scheduled
  IF game_status != 'scheduled' OR game_time <= NOW() THEN
    RAISE EXCEPTION 'Cannot modify picks for % @ %. Game has already started or is completed (status: %, time: %)', 
      game_away, game_home, game_status, game_time;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER enforce_pick_timing
  BEFORE INSERT OR UPDATE ON picks
  FOR EACH ROW
  EXECUTE FUNCTION check_pick_timing();

COMMENT ON FUNCTION check_pick_timing() IS 'Prevents user picks/updates after game has started, but allows system scoring updates';

