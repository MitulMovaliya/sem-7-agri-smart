export const formatProduct = (product: any) => {
  return {
    id: product.id,
    farmer_id: product.farmerId,
    crop_name: product.cropName,
    crop_category: product.cropCategory,
    quantity: product.quantity,
    quantity_unit: product.quantityUnit,
    price_per_unit: product.pricePerUnit,
    description: product.description,
    quality_grade: product.qualityGrade,
    images: product.images,
    status: product.status,
    rejection_reason: product.rejectionReason || null,
    createdAt: product.createdAt,
    profiles: product.profiles ? {
      full_name: product.profiles.fullName
    } : undefined
  };
};
export default { formatProduct };
