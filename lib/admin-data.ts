'use client';

import { createClient } from '@/lib/supabase/client';
import type {
  Analytics,
  Category,
  DashboardStats,
  Order,
  Pagination,
  Product,
  User,
} from '@/lib/types';

type CategoryRow = {
  id: number;
  slug: string;
  name: string;
  description: string;
  image_url: string | null;
  created_at: string;
};

type ProductImageRow = {
  id: number;
  image_url: string;
  is_primary: boolean;
};

type ProductRow = {
  id: number;
  name: string;
  description: string;
  price: number | string;
  stock: number;
  category_id: number | null;
  created_at: string;
  product_images: ProductImageRow[] | null;
};

type ProfileRow = {
  id: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  created_at: string;
};

type OrderRow = {
  id: number;
  user_id: string;
  total_amount: number | string;
  status: string;
  created_at: string;
};

type OrderItemRow = {
  id: number;
  order_id: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_price: number | string;
};

type DashboardStatsRow = {
  total_users: number;
  total_products: number;
  total_orders: number;
  total_revenue: number | string;
  pending_orders: number;
};

type ProductSalesSummaryRow = {
  product_id: number | null;
  product_name: string;
  total_quantity: number;
  order_count: number;
  total_revenue: number | string;
};

const supabase = createClient();

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function escapeCsv(value: string | number | null | undefined): string {
  const normalized = String(value ?? '');
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url ?? undefined,
    createdAt: row.created_at,
  };
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: String(row.price),
    stock: row.stock,
    categoryId: row.category_id ?? undefined,
    createdAt: row.created_at,
    images: (row.product_images ?? []).map((image) => ({
      id: image.id,
      imageUrl: image.image_url,
      isPrimary: image.is_primary,
    })),
  };
}

function mapUser(row: ProfileRow): User {
  return {
    id: row.id,
    email: row.email,
    firstname: row.first_name,
    lastname: row.last_name,
    phonenumber: row.phone_number ?? undefined,
    role: row.role,
    createdAt: row.created_at,
  };
}

function mapOrder(
  row: OrderRow,
  profiles: Map<string, ProfileRow>,
  orderItemsByOrderId?: Map<number, OrderItemRow[]>
): Order {
  const profile = profiles.get(row.user_id);
  const orderItems = orderItemsByOrderId?.get(row.id) ?? [];

  return {
    id: row.id,
    userId: row.user_id,
    orderDate: row.created_at,
    totalAmount: String(row.total_amount),
    status: row.status,
    createdAt: row.created_at,
    user: profile
      ? {
          email: profile.email,
          firstname: profile.first_name,
          lastname: profile.last_name,
        }
      : undefined,
    orderItems: orderItems.map((item) => ({
      id: item.id,
      orderId: item.order_id,
      productId: item.product_id ?? 0,
      quantity: item.quantity,
      priceAtTime: String(item.unit_price),
      product: item.product_id
        ? {
            id: item.product_id,
            name: item.product_name,
          }
        : undefined,
    })),
  };
}

async function ensureUniqueSlug(
  table: 'categories' | 'products',
  label: string,
  ignoreId?: number
) {
  const baseSlug = slugify(label) || 'item';
  const { data, error } = await supabase
    .from(table)
    .select('id, slug')
    .ilike('slug', `${baseSlug}%`);

  if (error) throw error;

  const taken = new Set(
    (data ?? [])
      .filter((row) => row.id !== ignoreId)
      .map((row) => String(row.slug))
  );

  if (!taken.has(baseSlug)) return baseSlug;

  let suffix = 2;
  while (taken.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseSlug}-${suffix}`;
}

export async function listCategories(limit = 100): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, name, description, image_url, created_at')
    .order('name', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(mapCategory);
}

export async function saveCategory(input: {
  id?: number;
  name: string;
  description?: string;
  imageUrl?: string;
}) {
  const slug = await ensureUniqueSlug('categories', input.name, input.id);
  const payload = {
    slug,
    name: input.name,
    description: input.description ?? '',
    image_url: input.imageUrl || null,
  };

  if (input.id) {
    const { error } = await supabase.from('categories').update(payload).eq('id', input.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('categories').insert(payload);
  if (error) throw error;
}

export async function deleteCategory(id: number) {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

export async function listProducts(params: {
  page: number;
  limit: number;
  search: string;
}): Promise<{ data: Product[]; pagination: Pagination }> {
  const from = (params.page - 1) * params.limit;
  const to = from + params.limit - 1;

  let query = supabase
    .from('products')
    .select(
      'id, name, description, price, stock, category_id, created_at, product_images(id, image_url, is_primary)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (params.search.trim()) {
    query = query.ilike('name', `%${params.search.trim()}%`);
  }

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    data: (data ?? []).map(mapProduct),
    pagination: {
      page: params.page,
      limit: params.limit,
      total: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / params.limit)),
    },
  };
}

export async function saveProduct(input: {
  id?: number;
  name: string;
  description?: string;
  price: number;
  stock: number;
  categoryId: number;
  imageUrl?: string;
}) {
  const slug = await ensureUniqueSlug('products', input.name, input.id);
  const payload = {
    slug,
    name: input.name,
    description: input.description ?? '',
    price: input.price,
    stock: input.stock,
    category_id: input.categoryId,
  };

  let productId = input.id;

  if (input.id) {
    const { error } = await supabase.from('products').update(payload).eq('id', input.id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from('products')
      .insert(payload)
      .select('id')
      .single<{ id: number }>();
    if (error) throw error;
    productId = data.id;
  }

  if (!productId) return;

  const { error: deleteImagesError } = await supabase
    .from('product_images')
    .delete()
    .eq('product_id', productId);
  if (deleteImagesError) throw deleteImagesError;

  if (input.imageUrl) {
    const { error: insertImageError } = await supabase.from('product_images').insert({
      product_id: productId,
      image_url: input.imageUrl,
      is_primary: true,
      sort_order: 0,
    });
    if (insertImageError) throw insertImageError;
  }
}

export async function deleteProduct(id: number) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

async function loadProfilesByIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, ProfileRow>();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, first_name, last_name, phone_number, created_at')
    .in('id', ids);

  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.id, row as ProfileRow]));
}

export async function listUsers(params: {
  page: number;
  limit: number;
}): Promise<{ data: User[]; pagination: Pagination }> {
  const from = (params.page - 1) * params.limit;
  const to = from + params.limit - 1;

  const { data, count, error } = await supabase
    .from('profiles')
    .select('id, email, role, first_name, last_name, phone_number, created_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    data: (data ?? []).map((row) => mapUser(row as ProfileRow)),
    pagination: {
      page: params.page,
      limit: params.limit,
      total: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / params.limit)),
    },
  };
}

export async function setUserRole(userId: string, role: 'admin' | 'customer'): Promise<User> {
  const { data, error } = await supabase
    .rpc('set_user_role', {
      target_user_id: userId,
      new_role: role,
    })
    .single();

  if (error) throw error;

  return mapUser(data as ProfileRow);
}

export async function listOrders(params: {
  page: number;
  limit: number;
}): Promise<{ data: Order[]; pagination: Pagination }> {
  const from = (params.page - 1) * params.limit;
  const to = from + params.limit - 1;

  const { data, count, error } = await supabase
    .from('orders')
    .select('id, user_id, total_amount, status, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  const orderRows = (data ?? []) as OrderRow[];
  const userIds = [...new Set(orderRows.map((row) => row.user_id))];
  const profiles = await loadProfilesByIds(userIds);

  return {
    data: orderRows.map((row) => mapOrder(row, profiles)),
    pagination: {
      page: params.page,
      limit: params.limit,
      total: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / params.limit)),
    },
  };
}

export async function updateOrderStatus(id: number, status: string) {
  const { error } = await supabase.from('orders').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data: statsRow, error: statsError } = await supabase
    .from('admin_dashboard_stats')
    .select('total_users, total_products, total_orders, total_revenue, pending_orders')
    .single<DashboardStatsRow>();

  if (statsError) throw statsError;

  const recentOrders = await listOrders({ page: 1, limit: 5 });

  return {
    totalUsers: statsRow.total_users,
    totalProducts: statsRow.total_products,
    totalOrders: statsRow.total_orders,
    totalRevenue: String(statsRow.total_revenue),
    pendingOrders: statsRow.pending_orders,
    recentOrders: recentOrders.data,
  };
}

export async function getAnalytics(days = 30): Promise<{ analytics: Analytics; trends: { dailyRevenue: Record<string, number>; dailyOrders: Record<string, number> } }> {
  const [{ data: statsRow, error: statsError }, { data: popularRows, error: popularError }, { data: ordersRows, error: ordersError }] =
    await Promise.all([
      supabase
        .from('admin_dashboard_stats')
        .select('total_orders, total_revenue')
        .single<{ total_orders: number; total_revenue: number | string }>(),
      supabase
        .from('product_sales_summary')
        .select('product_id, product_name, total_quantity, order_count, total_revenue')
        .order('total_quantity', { ascending: false })
        .limit(8),
      supabase
        .from('orders')
        .select('id, user_id, total_amount, status, created_at')
        .order('created_at', { ascending: false }),
    ]);

  if (statsError) throw statsError;
  if (popularError) throw popularError;
  if (ordersError) throw ordersError;

  const orderRows = (ordersRows ?? []) as OrderRow[];
  const userIds = [...new Set(orderRows.map((row) => row.user_id))];
  const profiles = await loadProfilesByIds(userIds);

  const revenueByStatusMap = new Map<string, { total: number; count: number }>();
  const dailyRevenue: Record<string, number> = {};
  const dailyOrders: Record<string, number> = {};
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);

  for (const order of orderRows) {
    const amount = Number.parseFloat(String(order.total_amount));
    const current = revenueByStatusMap.get(order.status) ?? { total: 0, count: 0 };
    revenueByStatusMap.set(order.status, {
      total: current.total + amount,
      count: current.count + 1,
    });

    const createdAt = new Date(order.created_at);
    if (createdAt >= cutoff) {
      const key = createdAt.toISOString().slice(0, 10);
      dailyRevenue[key] = (dailyRevenue[key] ?? 0) + amount;
      dailyOrders[key] = (dailyOrders[key] ?? 0) + 1;
    }
  }

  const analytics: Analytics = {
    totalRevenue: String(statsRow.total_revenue),
    totalOrders: statsRow.total_orders,
    popularProducts: ((popularRows ?? []) as ProductSalesSummaryRow[]).map((row) => ({
      product: row.product_id
        ? {
            id: row.product_id,
            name: row.product_name,
          }
        : undefined,
      totalQuantity: row.total_quantity,
      orderCount: row.order_count,
    })),
    revenueByStatus: [...revenueByStatusMap.entries()].map(([status, value]) => ({
      status,
      _sum: { totalAmount: value.total.toFixed(2) },
      _count: { status: value.count },
    })),
    recentOrders: orderRows.slice(0, 5).map((row) => mapOrder(row, profiles)),
  };

  return {
    analytics,
    trends: {
      dailyRevenue,
      dailyOrders,
    },
  };
}

export async function exportProductsCsv() {
  const [categories, products] = await Promise.all([
    listCategories(),
    listProducts({ page: 1, limit: 1000, search: '' }),
  ]);

  const categoryMap = new Map(categories.map((category) => [category.id, category.name]));

  const rows = [
    ['ID', 'Name', 'Description', 'Price', 'Stock', 'Category', 'Images'].join(','),
    ...products.data.map((product) =>
      [
        escapeCsv(product.id),
        escapeCsv(product.name),
        escapeCsv(product.description ?? ''),
        escapeCsv(product.price),
        escapeCsv(product.stock),
        escapeCsv(categoryMap.get(product.categoryId ?? 0) ?? ''),
        escapeCsv((product.images ?? []).map((image) => image.imageUrl).join(' | ')),
      ].join(',')
    ),
  ];

  return new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
}

export async function importProducts(products: Array<Record<string, unknown>>) {
  let count = 0;

  for (const product of products) {
    const name = String(product.name ?? '').trim();
    const categoryId = Number.parseInt(String(product.categoryId ?? ''), 10);
    const price = Number.parseFloat(String(product.price ?? 0));
    const stock = Number.parseInt(String(product.stock ?? 0), 10);

    if (!name || Number.isNaN(categoryId) || Number.isNaN(price) || Number.isNaN(stock)) {
      continue;
    }

    const slug = await ensureUniqueSlug('products', name);

    const { data, error } = await supabase
      .from('products')
      .insert({
        slug,
        name,
        description: String(product.description ?? ''),
        price,
        stock,
        category_id: categoryId,
      })
      .select('id')
      .single<{ id: number }>();

    if (error) throw error;

    const imageUrl =
      typeof product.imageUrl === 'string'
        ? product.imageUrl
        : Array.isArray(product.images) && typeof product.images[0] === 'string'
          ? product.images[0]
          : '';

    if (imageUrl) {
      const { error: imageError } = await supabase.from('product_images').insert({
        product_id: data.id,
        image_url: imageUrl,
        is_primary: true,
        sort_order: 0,
      });

      if (imageError) throw imageError;
    }

    count += 1;
  }

  return count;
}
