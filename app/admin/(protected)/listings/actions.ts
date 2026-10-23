"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { MediaValidationError } from "@/lib/media/image";
import {
  ListingNotFoundError,
  createListing,
  deleteListing,
  setListingSold,
  updateListing,
} from "@/lib/listings/service";
import type { ListingInput } from "@/lib/listings/types";
import { listingInputSchema } from "@/lib/listings/validation";

export type ListingFormValues = {
  title: string;
  description: string;
  priceIdr: string;
  videoUrl: string;
  isSold: boolean;
};

export type ListingFormState =
  | {
      message?: string;
      fieldErrors?: Record<string, string>;
      values?: ListingFormValues;
    }
  | undefined;

const idSchema = z.string().uuid();

function readValues(formData: FormData): ListingFormValues {
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    priceIdr: String(formData.get("priceIdr") ?? "").trim(),
    videoUrl: String(formData.get("videoUrl") ?? "").trim(),
    isSold: formData.get("isSold") === "on",
  };
}

function readImage(formData: FormData): File | null {
  const value = formData.get("image");

  return value instanceof File && value.size > 0 ? value : null;
}

function validate(
  values: ListingFormValues,
):
  | { data: ListingInput; fieldErrors?: undefined }
  | { data?: undefined; fieldErrors: Record<string, string> } {
  const parsed = listingInputSchema.safeParse({
    title: values.title,
    description: values.description,
    priceIdr: Number(values.priceIdr),
    videoUrl: values.videoUrl,
    isSold: values.isSold,
  });

  if (parsed.success) {
    return { data: parsed.data };
  }

  const flattened = z.flattenError(parsed.error);
  const fieldErrors: Record<string, string> = {};

  for (const [field, messages] of Object.entries(flattened.fieldErrors)) {
    if (messages?.[0]) {
      fieldErrors[field] = messages[0];
    }
  }

  if (values.priceIdr === "") {
    fieldErrors.priceIdr = "Harga wajib diisi.";
  }

  return { fieldErrors };
}

function revalidateListingPages() {
  revalidatePath("/");
  revalidatePath("/akun/[code]", "page");
  revalidatePath("/admin");
}

export async function createListingAction(
  _previousState: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  await requireAdmin();

  const values = readValues(formData);
  const image = readImage(formData);
  const result = validate(values);

  if (!result.data) {
    return {
      values,
      fieldErrors: {
        ...result.fieldErrors,
        ...(image ? {} : { image: "Thumbnail wajib diunggah." }),
      },
    };
  }

  if (!image) {
    return { values, fieldErrors: { image: "Thumbnail wajib diunggah." } };
  }

  let code: string;

  try {
    ({ code } = await createListing(result.data, image));
  } catch (error) {
    if (error instanceof MediaValidationError) {
      return { values, fieldErrors: { image: error.message } };
    }

    throw error;
  }

  revalidateListingPages();
  redirect(`/admin?created=${encodeURIComponent(code)}`);
}

export async function updateListingAction(
  _previousState: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  await requireAdmin();

  const id = idSchema.safeParse(formData.get("id"));

  if (!id.success) {
    redirect("/admin");
  }

  const values = readValues(formData);
  const image = readImage(formData);
  const result = validate(values);

  if (!result.data) {
    return { values, fieldErrors: result.fieldErrors };
  }

  let code: string;

  try {
    ({ code } = await updateListing(id.data, result.data, image ?? undefined));
  } catch (error) {
    if (error instanceof MediaValidationError) {
      return { values, fieldErrors: { image: error.message } };
    }

    if (error instanceof ListingNotFoundError) {
      return { message: error.message, values };
    }

    throw error;
  }

  revalidateListingPages();
  redirect(`/admin?updated=${encodeURIComponent(code)}`);
}

export async function setListingSoldAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = idSchema.safeParse(formData.get("id"));

  if (!id.success) {
    redirect("/admin");
  }

  await setListingSold(id.data, formData.get("sold") === "true");
  revalidateListingPages();
  redirect("/admin");
}

export async function deleteListingAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = idSchema.safeParse(formData.get("id"));

  if (!id.success) {
    redirect("/admin");
  }

  await deleteListing(id.data);
  revalidateListingPages();
  redirect("/admin?deleted=1");
}
