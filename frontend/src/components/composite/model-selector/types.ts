/**
 * Model selector types
 */

export interface Provider {
  provider: string;
  isHealthy: boolean;
  availableModels: string[];
}

export interface CombinedModelSelectorProps {
  providers: Provider[];
  selectedProvider: string;
  selectedModel: string;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  disabled?: boolean;
  /** Callback to refresh providers by clearing cache and fetching fresh data */
  onRefresh?: () => Promise<void>;
  /** Whether providers are currently being refreshed */
  isRefreshing?: boolean;
}

export interface ProviderTabsProps {
  providers: Provider[];
  selectedProvider: string;
  onProviderSelect: (provider: string) => void;
  isDarkMode: boolean;
}

export interface ModelsListProps {
  groupedModels: ModelCategoryGroup[];
  flatModelList: FlatModelItem[];
  selectedModel: string;
  focusedIndex: number | null;
  onModelSelect: (model: string) => void;
  onModelHover: (index: number) => void;
  isBlueTheme: boolean;
}

export interface ModelSelectorTriggerProps {
  selectedProvider: string;
  selectedModel: string;
  selectedProviderLogo: string | null;
  isOpen: boolean;
  isRefreshing: boolean;
  disabled: boolean;
  isDarkMode: boolean;
  onClick: () => void;
}

export interface RefreshButtonProps {
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  disabled: boolean;
}

export interface FlatModelItem {
  type: 'model' | 'header';
  value: string;
  category?: string;
}

export interface ModelCategoryGroup {
  category: string;
  displayName: string;
  models: string[];
}

export interface UseModelSelectorKeyboardOptions {
  isOpen: boolean;
  flatModelList: FlatModelItem[];
  selectedModel: string;
  focusedIndex: number | null;
  setFocusedIndex: (index: number | null) => void;
  onModelChange: (model: string) => void;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}
