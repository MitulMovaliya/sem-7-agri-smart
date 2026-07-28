export const formatOrder = (order: any) => {
  const farmerData = order.farmer || order.profiles;
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
    buyer: order.buyer ? {
      id: order.buyer.id,
      full_name: order.buyer.fullName,
      email: order.buyer.email
    } : null,
    farmer: farmerData ? {
      id: farmerData.id,
      full_name: farmerData.fullName,
      email: farmerData.email
    } : null,
    profiles: farmerData ? {
      full_name: farmerData.fullName
    } : null
  };
};
export default { formatOrder };
