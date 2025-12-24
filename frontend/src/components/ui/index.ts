/**
 * UI Components Index
 *
 * This file exports all shadcn/ui-style components for easy importing.
 * Components are built on Radix UI primitives with custom theming.
 *
 * @example
 * import { Button, Input, Dialog, DialogContent } from '@/components/ui';
 */

// Form Controls
export { Button, buttonVariants } from "./Button";
export type { ButtonProps } from "./Button";

export { Input } from "./Input";
export type { InputProps } from "./Input";

export { Textarea } from "./Textarea";
export type { TextareaProps } from "./Textarea";

export { Checkbox } from "./Checkbox";
export type { CheckboxProps } from "./Checkbox";

export { RadioGroup, RadioGroupItem } from "./RadioGroup";
export type { RadioGroupItemProps } from "./RadioGroup";

export { Switch } from "./Switch";
export type { SwitchProps } from "./Switch";

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from "./Select";

export { Slider } from "./Slider";
export type { SliderProps } from "./Slider";

export { Label } from "./Label";
export type { LabelProps } from "./Label";

// Feedback
export { Alert, AlertTitle, AlertDescription } from "./Alert";

export { Badge, badgeVariants } from "./Badge";
export type { BadgeProps } from "./Badge";

export { Progress } from "./Progress";
export type { ProgressProps } from "./Progress";

export { Skeleton } from "./Skeleton";
export type { SkeletonProps } from "./Skeleton";

export { Tooltip, InfoIcon } from "./Tooltip";
export type { TooltipProps } from "./Tooltip";

// Overlays
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from "./Dialog";

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
  PopoverClose,
} from "./Popover";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from "./DropdownMenu";

// Layout
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "./Card";

export { Separator } from "./Separator";

export { ScrollArea, ScrollBar } from "./ScrollArea";

export { Avatar, AvatarImage, AvatarFallback } from "./Avatar";

// Navigation
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./Tabs";

// Icons
export { Icons } from "./icons";
export type { IconProps } from "./icons";
export * from "./icons";

// Notifications
export { IndexingNotification } from "./indexing-notification";

// Legacy Components (to be migrated)
export { Pagination } from "./Pagination";
