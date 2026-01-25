import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@serviceflow/database';

// TODO: Move to cloud storage (Vercel Blob, S3, or Cloudinary) for production
// Storing base64 in database is not ideal for performance at scale
const MAX_FILE_SIZE = 200 * 1024; // 200KB - small to avoid database bloat
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// POST /api/users/me/avatar - Upload avatar image
export async function POST(request: Request) {
  try {
    const { userId: clerkId } = auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json(
        { error: { message: 'User not found' } },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: { message: 'No file provided' } },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: { message: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.' } },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: { message: 'File too large. Maximum size is 200KB. Please resize your image.' } },
        { status: 400 }
      );
    }

    // Convert file to base64 data URL
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Update user with new avatar URL
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: dataUrl },
    });

    return NextResponse.json({
      success: true,
      avatarUrl: updatedUser.avatarUrl,
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json(
      { error: { message: 'Failed to upload avatar' } },
      { status: 500 }
    );
  }
}

// DELETE /api/users/me/avatar - Remove avatar image
export async function DELETE() {
  try {
    const { userId: clerkId } = auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json(
        { error: { message: 'User not found' } },
        { status: 404 }
      );
    }

    // Remove avatar URL
    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Avatar delete error:', error);
    return NextResponse.json(
      { error: { message: 'Failed to delete avatar' } },
      { status: 500 }
    );
  }
}
