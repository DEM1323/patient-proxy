-- Create the simulation_scenarios table
CREATE TABLE simulation_scenarios
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    estimated_time_minutes INTEGER NOT NULL DEFAULT 15,
    guided_reflection_time_minutes INTEGER DEFAULT 15,
    target_group TEXT DEFAULT 'Nurses',
    brief_summary TEXT NOT NULL,
    learning_objectives JSONB NOT NULL DEFAULT '[]',
    student_report TEXT,
    patient_profile_id TEXT REFERENCES patient_profiles(id),
    medical_history_prior TEXT,
    medical_history_recent TEXT,
    correct_treatment_steps JSONB NOT NULL DEFAULT '[]',
    nursing_diagnosis JSONB NOT NULL DEFAULT '[]',
    scenario_chart JSONB NOT NULL DEFAULT '[]',
    debriefing_notes TEXT,
    ai_patient_prompts JSONB NOT NULL DEFAULT '[]',
    ai_expected_actions JSONB NOT NULL DEFAULT '[]',
    ai_observation_log JSONB DEFAULT '[]',
    ai_feedback_rules JSONB NOT NULL DEFAULT '[]',
    ai_debrief_template TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_global BOOLEAN DEFAULT FALSE
);

-- Add RLS policies
ALTER TABLE simulation_scenarios ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows users to view their own scenarios and global ones
CREATE POLICY "Users can view their own scenarios and global ones" 
  ON simulation_scenarios 
  FOR
SELECT
    USING (
    auth.uid() = created_by OR
        is_global = TRUE
  );

-- Create a policy that allows users to insert their own scenarios
CREATE POLICY "Users can insert their own scenarios" 
  ON simulation_scenarios 
  FOR
INSERT 
  WITH CHECK (auth.uid() =
created_by);

-- Create a policy that allows users to update their own scenarios that aren't global
CREATE POLICY "Users can update their own scenarios" 
  ON simulation_scenarios 
  FOR
UPDATE 
  USING (auth.uid()
= created_by AND is_global = FALSE)
  WITH CHECK
(auth.uid
() = created_by AND is_global = FALSE);

-- Create a policy that allows users to delete their own scenarios that aren't global
CREATE POLICY "Users can delete their own scenarios" 
  ON simulation_scenarios 
  FOR
DELETE 
  USING (auth.uid
() = created_by AND is_global = FALSE);

-- Create a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_simulation_scenario_updated_at
()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW
();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_simulation_scenario_updated_at
BEFORE
UPDATE ON simulation_scenarios
FOR EACH ROW
EXECUTE FUNCTION update_simulation_scenario_updated_at
();

-- Add index for performance
CREATE INDEX idx_simulation_scenarios_created_by ON simulation_scenarios(created_by);
CREATE INDEX idx_simulation_scenarios_patient_profile_id ON simulation_scenarios(patient_profile_id);
CREATE INDEX idx_simulation_scenarios_is_global ON simulation_scenarios(is_global); 