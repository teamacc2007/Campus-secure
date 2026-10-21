"""initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-21 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Institutions
    op.create_table(
        'institutions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('short_code', sa.String(length=50), nullable=False),
        sa.Column('address', sa.String(length=500), nullable=True),
        sa.Column('campus_code', sa.String(length=50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_institutions_id', 'institutions', ['id'])
    op.create_index('ix_institutions_short_code', 'institutions', ['short_code'], unique=True)

    # 2. Users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('institution_id', sa.Integer(), nullable=True),
        sa.Column('last_login_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['institution_id'], ['institutions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_users_id', 'users', ['id'])
    op.create_index('ix_users_username', 'users', ['username'], unique=True)
    op.create_index('ix_users_role', 'users', ['role'])

    # 3. Students
    op.create_table(
        'students',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('register_number', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('initials', sa.String(length=10), nullable=True),
        sa.Column('date_of_birth', sa.String(length=50), nullable=True),
        sa.Column('department', sa.String(length=150), nullable=False),
        sa.Column('year_roman', sa.String(length=20), nullable=False),
        sa.Column('batch', sa.String(length=50), nullable=False),
        sa.Column('institution_id', sa.Integer(), nullable=True),
        sa.Column('residence_type', sa.String(length=50), nullable=True),
        sa.Column('hostel_name', sa.String(length=100), nullable=True),
        sa.Column('room_number', sa.String(length=50), nullable=True),
        sa.Column('bus_route', sa.String(length=50), nullable=True),
        sa.Column('bus_boarding_point', sa.String(length=100), nullable=True),
        sa.Column('vehicle_number', sa.String(length=50), nullable=True),
        sa.Column('photo_url', sa.String(length=500), nullable=True),
        sa.Column('face_embedding', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['institution_id'], ['institutions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_students_id', 'students', ['id'])
    op.create_index('ix_students_register_number', 'students', ['register_number'], unique=True)

    # 4. Staff
    op.create_table(
        'staff',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('department', sa.String(length=150), nullable=False),
        sa.Column('designation', sa.String(length=100), nullable=False),
        sa.Column('institution_id', sa.Integer(), nullable=True),
        sa.Column('photo_url', sa.String(length=500), nullable=True),
        sa.Column('face_embedding', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['institution_id'], ['institutions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_staff_id', 'staff', ['id'])
    op.create_index('ix_staff_employee_id', 'staff', ['employee_id'], unique=True)

    # 5. Supervisors & Security Guards
    op.create_table(
        'supervisors',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('supervisor_code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('department', sa.String(length=150), nullable=True),
        sa.Column('assigned_zone', sa.String(length=150), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_supervisors_id', 'supervisors', ['id'])
    op.create_index('ix_supervisors_supervisor_code', 'supervisors', ['supervisor_code'], unique=True)

    op.create_table(
        'security_guards',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('guard_code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=50), nullable=False),
        sa.Column('current_gate', sa.String(length=100), nullable=True),
        sa.Column('shift_name', sa.String(length=50), nullable=True),
        sa.Column('shift_start', sa.String(length=20), nullable=True),
        sa.Column('shift_end', sa.String(length=20), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('assigned_supervisor_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['assigned_supervisor_id'], ['supervisors.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_security_guards_id', 'security_guards', ['id'])
    op.create_index('ix_security_guards_guard_code', 'security_guards', ['guard_code'], unique=True)

    # 6. Visitor Passes
    op.create_table(
        'visitor_passes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('pass_number', sa.String(length=50), nullable=False),
        sa.Column('visitor_name', sa.String(length=255), nullable=False),
        sa.Column('visitor_phone', sa.String(length=50), nullable=False),
        sa.Column('photo_url', sa.String(length=500), nullable=True),
        sa.Column('purpose', sa.String(length=255), nullable=False),
        sa.Column('proof_document_url', sa.String(length=500), nullable=True),
        sa.Column('event_name', sa.String(length=255), nullable=True),
        sa.Column('event_purpose', sa.String(length=255), nullable=True),
        sa.Column('start_date', sa.String(length=50), nullable=False),
        sa.Column('end_date', sa.String(length=50), nullable=False),
        sa.Column('accessible_blocks', sa.JSON(), nullable=False),
        sa.Column('coordinator_name', sa.String(length=255), nullable=False),
        sa.Column('coordinator_phone', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('is_bulk', sa.Boolean(), nullable=True),
        sa.Column('cancellation_reason', sa.Text(), nullable=True),
        sa.Column('cancelled_by', sa.String(length=100), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_visitor_passes_id', 'visitor_passes', ['id'])
    op.create_index('ix_visitor_passes_pass_number', 'visitor_passes', ['pass_number'], unique=True)
    op.create_index('ix_visitor_passes_status', 'visitor_passes', ['status'])

    # 7. Access Logs
    op.create_table(
        'access_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('record_identifier', sa.String(length=50), nullable=False),
        sa.Column('person_type', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('identifier_value', sa.String(length=100), nullable=False),
        sa.Column('department', sa.String(length=150), nullable=True),
        sa.Column('location_block', sa.String(length=150), nullable=False),
        sa.Column('guard_name', sa.String(length=100), nullable=True),
        sa.Column('event_type', sa.String(length=20), nullable=False),
        sa.Column('verification_method', sa.String(length=50), nullable=False),
        sa.Column('verification_status', sa.String(length=50), nullable=False),
        sa.Column('review_status', sa.String(length=50), nullable=False),
        sa.Column('review_actions', sa.JSON(), nullable=False),
        sa.Column('flag_reason', sa.Text(), nullable=True),
        sa.Column('snapshot_url', sa.String(length=500), nullable=True),
        sa.Column('student_id', sa.Integer(), nullable=True),
        sa.Column('staff_id', sa.Integer(), nullable=True),
        sa.Column('visitor_pass_id', sa.Integer(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['staff_id'], ['staff.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['visitor_pass_id'], ['visitor_passes.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_access_logs_id', 'access_logs', ['id'])
    op.create_index('ix_access_logs_record_identifier', 'access_logs', ['record_identifier'], unique=True)
    op.create_index('ix_access_logs_review_status', 'access_logs', ['review_status'])

    # 8. Notifications
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('recipient_role', sa.String(length=50), nullable=True),
        sa.Column('recipient_username', sa.String(length=100), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('notification_type', sa.String(length=50), nullable=True),
        sa.Column('reference_id', sa.String(length=100), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=True),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_notifications_id', 'notifications', ['id'])


def downgrade() -> None:
    op.drop_table('notifications')
    op.drop_table('access_logs')
    op.drop_table('visitor_passes')
    op.drop_table('security_guards')
    op.drop_table('supervisors')
    op.drop_table('staff')
    op.drop_table('students')
    op.drop_table('users')
    op.drop_table('institutions')
