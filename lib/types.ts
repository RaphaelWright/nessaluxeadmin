export interface User {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  phonenumber?: string;
  role: string;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  createdAt: string;
}

export interface ProductImage {
  id: number;
  imageUrl: string;
  isPrimary: boolean;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  price: string;
  stock: number;
  categoryId?: number;
  createdAt: string;
  images?: ProductImage[];
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  priceAtTime: string;
  product?: { id: number; name: string };
}

export interface Order {
  id: number;
  userId: string;
  orderDate: string;
  totalAmount: string;
  status: string;
  createdAt: string;
  user?: { email: string; firstname: string; lastname: string };
  orderItems?: OrderItem[];
}

export interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: string;
  pendingOrders: number;
  recentOrders: Order[];
}

export interface Analytics {
  totalRevenue: string;
  totalOrders: number;
  popularProducts: Array<{
    product?: { id: number; name: string };
    totalQuantity: number;
    orderCount: number;
  }>;
  revenueByStatus: Array<{
    status: string;
    _sum: { totalAmount: string };
    _count: { status: number };
  }>;
  recentOrders: Order[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
