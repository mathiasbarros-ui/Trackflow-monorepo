export type Warehouse = "LA" | "ZGZ";

export type SKU = {
  id: number;
  name: string;
  sku: string;
  client_name: string;
  category: string;
  warehouse: Warehouse;
  current_stock: number;
};

export type StockEntryCreate = {
  sku_id: number;
  quantity: number;
  reference: string;
  warehouse: Warehouse;
};

export type StockExitCreate = {
  sku_id: number;
  quantity: number;
  exit_type: "dispatch" | "loss";
  tracking_number: string | null;
  warehouse: Warehouse;
};

export type StockEntryResponse = StockEntryCreate & {
  id: number;
  created_at: string;
  user_uuid: string;
};

export type StockExitResponse = StockExitCreate & {
  id: number;
  created_at: string;
  user_uuid: string;
};

export type StockMovement = {
  id: number;
  movement_type: "inbound" | "outbound";
  quantity: number;
  created_at: string;
  user_uuid: string;
  sku: Omit<SKU, "current_stock">;
};