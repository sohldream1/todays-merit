-- CreateIndex
CREATE UNIQUE INDEX "swag_products_organization_id_external_product_id_key" ON "swag_products"("organization_id", "external_product_id");
