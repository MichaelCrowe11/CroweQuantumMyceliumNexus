import React from 'react';
import { Box, Typography, Paper, Switch, FormControlLabel, Divider } from '@mui/material';
import { useAppStore } from '../../store/appStore';

export const Settings: React.FC = () => {
  const { darkMode, setDarkMode } = useAppStore();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Settings
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Appearance
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={darkMode}
              onChange={(e) => setDarkMode(e.target.checked)}
            />
          }
          label="Dark Mode"
        />

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ mb: 2 }}>
          API Configuration
        </Typography>
        <Typography variant="body2" color="text.secondary">
          API endpoints and authentication settings
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ mb: 2 }}>
          Quantum Backend
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure quantum computing backend providers
        </Typography>
      </Paper>
    </Box>
  );
};