import type { AgencyDocument } from "../types";
import { getCurrentProfile } from "./auth";
import { createNotificationEvent } from "./notificationEvents";
import { isSupabaseConfigured, supabase } from "./supabase";

export type AgencyDocumentType =
  | "bail_license"
  | "business_registration"
  | "insurance_bond"
  | "other";

export type AgencyDocumentReviewStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "more_info_requested";

export type UploadAgencyDocumentInput = {
  agencyId: string;
  documentType: AgencyDocumentType;
  file: File | null;
};

export type AgencyDocumentMutationResult =
  | {
      ok: true;
      document: AgencyDocument;
      mocked: boolean;
      message: string;
    }
  | {
      ok: false;
      error: string;
    };

export type AgencyDocumentsResult =
  | {
      ok: true;
      documents: AgencyDocument[];
      mocked: boolean;
    }
  | {
      ok: false;
      error: string;
    };

const mockDocuments: AgencyDocument[] = [];

function safeFileName(name: string) {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || "agency-document";
}

function buildStoragePath(agencyId: string, fileName: string) {
  return `agency-documents/${agencyId}/${Date.now()}-${safeFileName(fileName)}`;
}

export async function uploadAgencyDocument(
  input: UploadAgencyDocumentInput,
): Promise<AgencyDocumentMutationResult> {
  if (!input.file || input.file.size === 0) {
    return {
      ok: false,
      error: "Choose a document file before uploading.",
    };
  }

  const storagePath = buildStoragePath(input.agencyId, input.file.name);

  if (!isSupabaseConfigured || !supabase) {
    const now = new Date().toISOString();
    const document: AgencyDocument = {
      id: `mock-document-${Date.now()}`,
      agency_id: input.agencyId,
      uploaded_by_profile_id: "mock-profile",
      document_type: input.documentType,
      file_name: input.file.name,
      file_path: storagePath,
      mime_type: input.file.type || null,
      file_size: input.file.size,
      review_status: "pending",
      admin_notes: null,
      created_at: now,
      updated_at: now,
    };

    mockDocuments.unshift(document);
    await createNotificationEvent({
      eventType: "agency_document_uploaded",
      entityType: "agency_document",
      entityId: document.id,
      recipientProfileId: document.uploaded_by_profile_id || null,
      channel: "in_app",
      payload: {
        agency_id: input.agencyId,
        document_type: input.documentType,
        file_name: input.file.name,
      },
    });

    return {
      ok: true,
      document,
      mocked: true,
      message: "Document captured locally. Configure Supabase Storage to upload real files.",
    };
  }

  const profile = await getCurrentProfile();

  if (profile?.role !== "agency") {
    return {
      ok: false,
      error: "Only agency accounts can upload verification documents.",
    };
  }

  const { error: uploadError } = await supabase.storage
    .from("agency-documents")
    .upload(storagePath, input.file, {
      cacheControl: "3600",
      upsert: false,
      contentType: input.file.type || undefined,
    });

  if (uploadError) {
    return {
      ok: false,
      error: uploadError.message || "Unable to upload document.",
    };
  }

  const { data, error } = await supabase
    .from("agency_documents")
    .insert({
      agency_id: input.agencyId,
      uploaded_by_profile_id: profile.id,
      document_type: input.documentType,
      file_name: input.file.name,
      file_path: storagePath,
      mime_type: input.file.type || null,
      file_size: input.file.size,
      review_status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    return {
      ok: false,
      error: error.message || "Document uploaded, but metadata was not saved.",
    };
  }

  await createNotificationEvent({
    eventType: "agency_document_uploaded",
    entityType: "agency_document",
    entityId: data.id as string,
    recipientProfileId: profile.id,
    channel: "in_app",
    payload: {
      agency_id: input.agencyId,
      document_type: input.documentType,
      file_name: input.file.name,
    },
  });

  return {
    ok: true,
    document: data as AgencyDocument,
    mocked: false,
    message: "Document uploaded for admin review.",
  };
}

export async function getAgencyDocumentsForAgency(
  agencyId: string,
): Promise<AgencyDocumentsResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      documents: mockDocuments.filter((document) => document.agency_id === agencyId),
      mocked: true,
    };
  }

  const { data, error } = await supabase
    .from("agency_documents")
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      error: error.message || "Unable to load agency documents.",
    };
  }

  return {
    ok: true,
    documents: (data || []) as AgencyDocument[],
    mocked: false,
  };
}

export async function getPendingAgencyDocuments(): Promise<AgencyDocumentsResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      documents: mockDocuments.filter((document) => document.review_status === "pending"),
      mocked: true,
    };
  }

  const { data, error } = await supabase
    .from("agency_documents")
    .select("*, agencies(business_name)")
    .eq("review_status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    return {
      ok: false,
      error: error.message || "Unable to load pending agency documents.",
    };
  }

  return {
    ok: true,
    documents: (data || []) as AgencyDocument[],
    mocked: false,
  };
}

export async function updateAgencyDocumentReviewStatus(
  documentId: string,
  status: AgencyDocumentReviewStatus,
  adminNotes: string,
): Promise<AgencyDocumentMutationResult> {
  if (!isSupabaseConfigured || !supabase) {
    const document = mockDocuments.find((item) => item.id === documentId);

    if (!document) {
      return {
        ok: false,
        error: "Document not found.",
      };
    }

    document.review_status = status;
    document.admin_notes = adminNotes || null;
    document.updated_at = new Date().toISOString();
    await createNotificationEvent({
      eventType: "agency_document_reviewed",
      entityType: "agency_document",
      entityId: documentId,
      recipientProfileId: document.uploaded_by_profile_id || null,
      channel: "in_app",
      payload: {
        agency_id: document.agency_id,
        status,
        admin_notes: adminNotes || null,
      },
    });

    return {
      ok: true,
      document,
      mocked: true,
      message: `Document marked ${status}.`,
    };
  }

  const { data, error } = await supabase
    .from("agency_documents")
    .update({
      review_status: status,
      admin_notes: adminNotes || null,
    })
    .eq("id", documentId)
    .select("*")
    .single();

  if (error) {
    return {
      ok: false,
      error: error.message || "Unable to update document review status.",
    };
  }

  await createNotificationEvent({
    eventType: "agency_document_reviewed",
    entityType: "agency_document",
    entityId: documentId,
    recipientProfileId: data.uploaded_by_profile_id || null,
    channel: "in_app",
    payload: {
      agency_id: data.agency_id,
      status,
      admin_notes: adminNotes || null,
    },
  });

  return {
    ok: true,
    document: data as AgencyDocument,
    mocked: false,
    message: `Document marked ${status}.`,
  };
}
