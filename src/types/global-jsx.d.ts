// React 19 removed the global JSX namespace. This declaration restores it
// so that existing `JSX.Element` return type annotations continue to work
// without changing every file.
import type { JSX as ReactJSX } from "react";

declare global {
  namespace JSX {
    export type Element = ReactJSX.Element;
    export type ElementClass = ReactJSX.ElementClass;
    export type ElementAttributesProperty = ReactJSX.ElementAttributesProperty;
    export type ElementChildrenAttribute = ReactJSX.ElementChildrenAttribute;
    export type IntrinsicAttributes = ReactJSX.IntrinsicAttributes;
    export type IntrinsicClassAttributes<T> = ReactJSX.IntrinsicClassAttributes<T>;
    export type IntrinsicElements = ReactJSX.IntrinsicElements;
  }
}

export {};
