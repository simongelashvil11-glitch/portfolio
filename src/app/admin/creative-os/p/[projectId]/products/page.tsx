import { asc, eq } from "drizzle-orm";

import { deleteProduct, saveProduct } from "@/actions/creative-os";
import { DeleteForm } from "@/components/admin/delete-form";
import { Card, EmptyState, Input, Textarea } from "@/components/admin/ui";
import { CosField, FieldGroup } from "@/components/creative-os/fields";
import { CosForm } from "@/components/creative-os/forms";
import { ChevronRight } from "@/components/fluent-icons";
import { db } from "@/db";
import { cosProducts, type CosProduct } from "@/db/creative-os";
import { getProjectOr404 } from "@/lib/creative-os/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Products" };

function ProductFields({ product }: { product?: CosProduct }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <CosField label="Product name" name="name">
          <Input name="name" required defaultValue={product?.name} />
        </CosField>
        <CosField label="Product or landing page URL" name="url">
          <Input name="url" type="url" defaultValue={product?.url ?? ""} placeholder="https://" />
        </CosField>
        <CosField label="Price" name="price">
          <Input name="price" defaultValue={product?.price ?? ""} placeholder="$49, or $39/month" />
        </CosField>
      </div>
      <CosField label="Description" name="description">
        <Textarea name="description" rows={4} defaultValue={product?.description ?? ""} />
      </CosField>
      <CosField label="Current offer" name="offer">
        <Textarea name="offer" rows={2} defaultValue={product?.offer ?? ""} placeholder="20% off the first order, free shipping over $50" />
      </CosField>
      <CosField label="Notes" name="notes">
        <Textarea name="notes" rows={2} defaultValue={product?.notes ?? ""} />
      </CosField>
    </div>
  );
}

export default async function ProductsPage({ params }: PageProps<"/admin/creative-os/p/[projectId]/products">) {
  const project = await getProjectOr404((await params).projectId);
  const products = await db.select().from(cosProducts).where(eq(cosProducts.projectId, project.id)).orderBy(asc(cosProducts.name));

  return (
    <div className="grid max-w-3xl gap-6">
      {products.length === 0 ? (
        <EmptyState>No products yet. Add the ones you write ads for.</EmptyState>
      ) : (
        <ul className="grid gap-3">
          {products.map((product) => (
            <li key={product.id}>
              <Card className="p-0">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-start gap-3 p-5 [&::-webkit-details-marker]:hidden">
                    <ChevronRight className="mt-0.5 size-4 shrink-0 text-faint transition-transform group-open:rotate-90" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{product.name}</span>
                      <span className="mt-0.5 block line-clamp-2 text-sm text-muted">
                        {[product.price, product.description].filter(Boolean).join(" · ") || "No description yet"}
                      </span>
                    </span>
                  </summary>
                  <div className="grid gap-4 border-t border-line p-5">
                    <CosForm action={saveProduct} submitLabel="Save product">
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="id" value={product.id} />
                      <ProductFields product={product} />
                    </CosForm>
                    <div className="flex items-center gap-2 text-sm text-muted">
                      Delete this product
                      <DeleteForm action={deleteProduct} id={product.id} confirmMessage={`Delete ${product.name}?`} />
                    </div>
                  </div>
                </details>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <FieldGroup title="Add a product">
        <CosForm action={saveProduct} submitLabel="Add product" resetOnSuccess>
          <input type="hidden" name="projectId" value={project.id} />
          <ProductFields />
        </CosForm>
      </FieldGroup>
    </div>
  );
}
