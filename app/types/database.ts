export interface UserSession {
  user: {
    id: string;
    email?: string;
    user_metadata: {
      avatar_url?: string;
      full_name?: string;
      email?: string;
    };
  } | null;
}

export type Tables = {
  patient_profiles: {
    id: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    is_global: boolean;
    patient_data: Record<string, any>;
  };
  simulation_scenarios: {
    id: string;
    title: string;
    estimated_time_minutes: number;
    guided_reflection_time_minutes?: number;
    target_group: string;
    brief_summary: string;
    learning_objectives: Record<string, any>[];
    student_report: string;
    patient_profile_id: string;
    medical_history_prior: string;
    medical_history_recent: string;
    correct_treatment_steps: string[];
    nursing_diagnosis: Record<string, any>[];
    scenario_chart: Record<string, any>[];
    debriefing_notes: string;
    ai_patient_prompts: Record<string, any>[];
    ai_expected_actions: string[];
    ai_observation_log?: Record<string, any>[];
    ai_feedback_rules: Record<string, any>[];
    ai_debrief_template: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    is_global: boolean;
  };
};
