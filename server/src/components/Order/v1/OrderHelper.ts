export const formatOrder = (order: any) => {
  return {
    id: order.id,
    product_id: order.productId,
    buyer_id: order.buyerId,
    farmer_id: order.farmerId,
    quantity: order.quantity,
    total_price: order.totalPrice,
    status: order.status,
    payment_status: order.paymentStatus,
    payment_method: order.paymentMethod,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    products: order.products ? {
      id: order.products.id,
      crop_name: order.products.cropName,
      quantity_unit: order.products.quantityUnit,
      price_per_unit: order.products.pricePerUnit
    } : null,
    profiles: order.profiles ? {
      full_name: order.profiles.fullName
    } : null
  };
};
export default { formatOrder };
