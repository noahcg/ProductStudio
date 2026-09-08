import type { ProductId } from "./ids";

/** A Product is the top-level thing being built. It can contain many projects. */
export interface Product {
  id: ProductId;
  name: string;
}

/** The intentionally small form used to start a new product. */
export interface ProductInput {
  name: string;
}
