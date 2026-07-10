import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import SmartNote from '@/models/SmartNote';
import { notifyAdminSmartNoteAssigned } from '@/lib/adminTaskNotifications';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    await connectDB();
    const SmartNoteModel = SmartNote as any;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'Invalid note ID' }, { status: 400 });
    }

    const body = await req.json();
    const currentNote = await SmartNoteModel.findOne({ _id: id, isDeleted: false }).lean();
    if (!currentNote) {
      return NextResponse.json({ success: false, message: 'Smart note not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      ...(body.title !== undefined && { title: String(body.title).trim() }),
      ...(body.body !== undefined && { body: String(body.body).trim() }),
      ...(body.tags !== undefined && { tags: Array.isArray(body.tags) ? body.tags : [] }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.city !== undefined && { city: String(body.city || '').trim() }),
      ...(body.assignedToId !== undefined && { assignedToId: body.assignedToId || '' }),
      ...(body.assignedToName !== undefined && { assignedToName: body.assignedToName || '' }),
      ...(body.assignmentStatus !== undefined && { assignmentStatus: body.assignmentStatus }),
    };

    // Reassigning a previously-unassigned note should reflect an assigned state.
    if (
      (body.assignedToId || body.assignedToName) &&
      body.assignmentStatus === undefined &&
      (currentNote.assignmentStatus === 'unassigned' || !currentNote.assignmentStatus)
    ) {
      updateData.assignmentStatus = 'assigned';
    }

    const note = await SmartNoteModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: updateData },
      { new: true }
    ).lean();

    const assignedToChanged =
      (body.assignedToId !== undefined || body.assignedToName !== undefined) &&
      (String(note.assignedToId || '') !== String(currentNote.assignedToId || '') ||
        String(note.assignedToName || '') !== String(currentNote.assignedToName || ''));

    if (assignedToChanged && (note.assignedToId || note.assignedToName) && !note.linkedSevaTaskId) {
      try {
        await notifyAdminSmartNoteAssigned({
          assignedToId: note.assignedToId,
          assignedToName: note.assignedToName,
          noteId: String(note._id),
          noteTitle: note.title,
          createdByName: note.createdByName,
        });
        await SmartNoteModel.updateOne({ _id: note._id }, { $set: { assignmentNotifiedAt: new Date() } });
      } catch (notificationError) {
        console.error('Error notifying admin for smart note reassignment:', notificationError);
      }
    }

    return NextResponse.json({ success: true, data: note, message: 'Smart note updated successfully' });
  } catch (error) {
    console.error('PUT Smart note error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update smart note' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    await connectDB();
    const SmartNoteModel = SmartNote as any;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'Invalid note ID' }, { status: 400 });
    }

    const note = await SmartNoteModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    ).lean();

    if (!note) {
      return NextResponse.json({ success: false, message: 'Smart note not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: note, message: 'Smart note deleted successfully' });
  } catch (error) {
    console.error('DELETE Smart note error:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete smart note' }, { status: 500 });
  }
}
