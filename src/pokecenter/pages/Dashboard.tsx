import { useCallback } from 'react';
import { usePokecenterStore } from '../pokecenterStore';
import { DashboardScene } from './DashboardScene';

export function Dashboard() {
  const setCurrentPage = usePokecenterStore(s => s.setCurrentPage);

  // Handle agent click - navigate to agent detail
  const handleAgentClick = useCallback((agentId: string) => {
    setCurrentPage(`agent:${agentId}`);
  }, [setCurrentPage]);

  // Handle agent delete - for now just log (can be expanded)
  const handleAgentDelete = useCallback((agentId: string) => {
    console.log('Delete agent:', agentId);
    // Could implement delete functionality here
  }, []);

  // Handle spawn click - could open a modal to add new agent
  const handleSpawnClick = useCallback(() => {
    console.log('Spawn new agent clicked');
    // Could implement spawn modal here
  }, []);

  // Render 3D only - the main dashboard view
  return (
    <DashboardScene 
      onAgentClick={handleAgentClick}
      onAgentDelete={handleAgentDelete}
      onSpawnClick={handleSpawnClick}
    />
  );
}
