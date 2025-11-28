'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import WorkflowDialog from './WorkflowDialog';

interface ApprovalWorkflow {
  id: number;
  name: string;
  description?: string;
  company?: string;
  department?: string;
  section?: string;
  steps: ApprovalWorkflowStep[];
  isActive: boolean;
}

interface ApprovalWorkflowStep {
  id: number;
  level: number;
  approverRole?: string;
  approverId?: number;
  approver?: {
    firstName: string;
    lastName: string;
  };
}

const formatRole = (role: string) => {
  const roles: Record<string, string> = {
    shift_supervisor: 'Shift Supervisor',
    section_head: 'Section Head',
    dept_manager: 'Department Manager',
    hr_manager: 'HR Manager',
    admin: 'Admin',
    hr: 'HR'
  };
  return roles[role] || role;
};

export default function ApprovalWorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<ApprovalWorkflow | undefined>(undefined);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/approval-workflows');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.details || 'Failed to fetch workflows');
      }
      const data = await res.json();
      setWorkflows(data);
    } catch (err: any) {
      setError(`Error loading workflows: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleCreate = () => {
    setSelectedWorkflow(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (workflow: ApprovalWorkflow) => {
    setSelectedWorkflow(workflow);
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    
    try {
      const res = await fetch(`/api/admin/approval-workflows/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      fetchWorkflows();
    } catch (err) {
      alert('Error deleting workflow');
    }
  };

  const handleSave = async () => {
    setDialogOpen(false);
    fetchWorkflows();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowLeft />}
          onClick={() => router.back()}
          color="inherit"
        >
          Back
        </Button>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          Approval Workflows
        </Typography>
        <Button
          variant="contained"
          startIcon={<Plus />}
          onClick={handleCreate}
        >
          Create Workflow
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Scope</TableCell>
                <TableCell>Steps</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workflows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    No workflows found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                workflows.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell>
                      <Typography variant="subtitle1">{workflow.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {workflow.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                        {workflow.company && (
                          <Chip label={`Company: ${workflow.company}`} size="small" color="primary" variant="outlined" />
                        )}
                        {workflow.department && (
                          <Chip label={`Dept: ${workflow.department}`} size="small" color="secondary" variant="outlined" />
                        )}
                        {workflow.section && (
                          <Chip label={`Section: ${workflow.section}`} size="small" color="info" variant="outlined" />
                        )}
                        {!workflow.company && !workflow.department && !workflow.section && (
                          <Chip label="Global" size="small" />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {workflow.steps.map((step, index) => (
                          <React.Fragment key={step.id}>
                            {index > 0 && <Typography color="text.secondary">→</Typography>}
                            <Chip
                              label={
                                step.approverRole
                                  ? `Role: ${formatRole(step.approverRole)}`
                                  : step.approver
                                  ? `${step.approver.firstName} ${step.approver.lastName}`
                                  : 'Unknown'
                              }
                              size="small"
                            />
                          </React.Fragment>
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => handleEdit(workflow)} color="primary">
                        <Pencil size={18} />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(workflow.id)} color="error">
                        <Trash2 size={18} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <WorkflowDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        workflow={selectedWorkflow}
      />
    </Container>
  );
}
