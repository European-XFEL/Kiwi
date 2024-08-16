import { useDispatch, useSelector } from "react-redux";
import { TypedUseSelectorHook } from "react-redux";
import { StoreState, StoreDispatch } from "./store";

// Typed hooks to be used by the Application - avoid repetitive type declarations
// and using the default Dispatch type, which lacks any used thunk middleware types.
export const useAppDispatch: () => StoreDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<StoreState> = useSelector;
