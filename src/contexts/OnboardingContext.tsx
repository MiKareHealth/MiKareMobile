import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';

// Define types for our state
type OnboardingProfile = {
  id?: string;
  fullName: string;
  relationship: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
};

type OnboardingAccount = {
  fullName: string;
  email: string;
  termsAccepted: boolean;
};

type OnboardingSettings = {
  timezone: string;
  timeFormat: '12h' | '24h';
  sessionTimeout: number;
};

type OnboardingState = {
  stepIndex: number;
  account: OnboardingAccount;
  profiles: OnboardingProfile[];
  settings: OnboardingSettings;
  error: string | null;
  submitting: boolean;
};

// Define actions for our reducer
type OnboardingAction =
  | { type: 'UPDATE_ACCOUNT'; payload: Partial<OnboardingAccount> }
  | { type: 'UPDATE_PROFILE'; payload: { index: number; data: Partial<OnboardingProfile> } }
  | { type: 'ADD_PROFILE' }
  | { type: 'REMOVE_PROFILE'; payload: number }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<OnboardingSettings> }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'RESET' }
  | { type: 'LOAD_STATE'; payload: Partial<OnboardingState> };

// Initial state
const initialState: OnboardingState = {
  stepIndex: 0,
  account: {
    fullName: '',
    email: '',
    termsAccepted: false,
  },
  profiles: [
    {
      fullName: '',
      relationship: '',
      dob: '',
      gender: 'Male',
    },
  ],
  settings: {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    timeFormat: '12h',
    sessionTimeout: 30,
  },
  error: null,
  submitting: false,
};

// Create reducer function
const onboardingReducer = (state: OnboardingState, action: OnboardingAction): OnboardingState => {
  switch (action.type) {
    case 'UPDATE_ACCOUNT':
      return {
        ...state,
        account: { ...state.account, ...action.payload },
      };
    case 'UPDATE_PROFILE':
      return {
        ...state,
        profiles: state.profiles.map((profile, index) =>
          index === action.payload.index
            ? { ...profile, ...action.payload.data }
            : profile
        ),
      };
    case 'ADD_PROFILE':
      return {
        ...state,
        profiles: [
          ...state.profiles,
          {
            fullName: '',
            relationship: '',
            dob: '',
            gender: 'Male',
          },
        ],
      };
    case 'REMOVE_PROFILE':
      return {
        ...state,
        profiles: state.profiles.filter((_, index) => index !== action.payload),
      };
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'SET_SUBMITTING':
      return {
        ...state,
        submitting: action.payload,
      };
    case 'NEXT_STEP':
      return {
        ...state,
        stepIndex: state.stepIndex + 1,
        error: null,
      };
    case 'PREV_STEP':
      return {
        ...state,
        stepIndex: Math.max(0, state.stepIndex - 1),
        error: null,
      };
    case 'RESET':
      return initialState;
    case 'LOAD_STATE':
      return {
        ...state,
        ...action.payload,
      };
    default:
      return state;
  }
};

// Create context
interface OnboardingContextType {
  state: OnboardingState;
  updateAccount: (data: Partial<OnboardingAccount>) => void;
  updateProfile: (index: number, data: Partial<OnboardingProfile>) => void;
  addProfile: () => void;
  removeProfile: (index: number) => void;
  updateSettings: (data: Partial<OnboardingSettings>) => void;
  nextStep: () => void;
  prevStep: () => void;
  setError: (error: string | null) => void;
  setSubmitting: (submitting: boolean) => void;
  reset: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Provider component
export const OnboardingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);

  // Load state from sessionStorage on mount
  useEffect(() => {
    try {
      // First try to load from onboardingState
      const savedState = sessionStorage.getItem('onboardingState');
      if (savedState) {
        dispatch({ type: 'LOAD_STATE', payload: JSON.parse(savedState) });
      } else {
        // Otherwise try to load individual pieces
        const accountData = sessionStorage.getItem('mikare_onboarding_account');
        if (accountData) {
          const parsedAccount = JSON.parse(accountData);
          dispatch({
            type: 'UPDATE_ACCOUNT',
            payload: {
              fullName: parsedAccount.fullName || '',
              email: parsedAccount.email || '',
            },
          });
        }
      }
    } catch (error) {
      console.error('Failed to load onboarding state from sessionStorage:', error);
    }
  }, []);

  // Save state to sessionStorage on state change
  useEffect(() => {
    try {
      sessionStorage.setItem('onboardingState', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save onboarding state to sessionStorage:', error);
    }
  }, [state]);

  // Action dispatchers
  const updateAccount = (data: Partial<OnboardingAccount>) => {
    dispatch({ type: 'UPDATE_ACCOUNT', payload: data });
  };

  const updateProfile = (index: number, data: Partial<OnboardingProfile>) => {
    dispatch({ type: 'UPDATE_PROFILE', payload: { index, data } });
  };

  const addProfile = () => {
    dispatch({ type: 'ADD_PROFILE' });
  };

  const removeProfile = (index: number) => {
    dispatch({ type: 'REMOVE_PROFILE', payload: index });
  };

  const updateSettings = (data: Partial<OnboardingSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: data });
  };

  const nextStep = () => {
    dispatch({ type: 'NEXT_STEP' });
  };

  const prevStep = () => {
    dispatch({ type: 'PREV_STEP' });
  };

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const setSubmitting = (submitting: boolean) => {
    dispatch({ type: 'SET_SUBMITTING', payload: submitting });
  };

  const reset = () => {
    dispatch({ type: 'RESET' });
  };

  const value = {
    state,
    updateAccount,
    updateProfile,
    addProfile,
    removeProfile,
    updateSettings,
    nextStep,
    prevStep,
    setError,
    setSubmitting,
    reset,
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
};

// Custom hook for using the context
export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
