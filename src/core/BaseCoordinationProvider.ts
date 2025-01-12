import { CoordinationProvider, AgentTeam, AgentRole, Collaboration, Message } from './interfaces';

export class BaseCoordinationProvider implements CoordinationProvider {
    private teams: Map<string, AgentTeam> = new Map();
    private collaborations: Map<string, Collaboration> = new Map();
    private messageHandlers: Map<string, (message: Message) => Promise<void>> = new Map();

    async initialize(): Promise<void> {
        // Initialize if needed
    }

    async shutdown(): Promise<void> {
        // Clean up active collaborations
        for (const collab of this.collaborations.values()) {
            if (collab.status === 'active') {
                await this.endCollaboration(collab.id, 'Forced shutdown');
            }
        }
    }

    async createTeam(team: AgentTeam): Promise<void> {
        // Validate team structure
        if (!team.members.length) {
            throw new Error('Team must have at least one member');
        }

        if (team.hierarchy) {
            const { leaderId, reportingChain } = team.hierarchy;
            // Validate leader exists in team
            if (!team.members.some(m => m.agentId === leaderId)) {
                throw new Error('Team leader must be a team member');
            }

            // Validate reporting chain
            for (const [managerId, reports] of Object.entries(reportingChain)) {
                if (!team.members.some(m => m.agentId === managerId)) {
                    throw new Error(`Manager ${managerId} not found in team`);
                }
                for (const reportId of reports) {
                    if (!team.members.some(m => m.agentId === reportId)) {
                        throw new Error(`Report ${reportId} not found in team`);
                    }
                }
            }
        }

        this.teams.set(team.id, team);
    }

    async addMember(teamId: string, agentId: string, role: AgentRole): Promise<void> {
        const team = this.teams.get(teamId);
        if (!team) {
            throw new Error(`Team ${teamId} not found`);
        }

        // Check if agent is already in team
        if (team.members.some(m => m.agentId === agentId)) {
            throw new Error(`Agent ${agentId} is already in team ${teamId}`);
        }

        // Add member
        team.members.push({
            agentId,
            role,
            status: 'active'
        });

        this.teams.set(teamId, team);
    }

    async removeMember(teamId: string, agentId: string): Promise<void> {
        const team = this.teams.get(teamId);
        if (!team) {
            throw new Error(`Team ${teamId} not found`);
        }

        // Check if agent is team leader
        if (team.hierarchy?.leaderId === agentId) {
            throw new Error(`Cannot remove team leader ${agentId}`);
        }

        // Check if agent manages others
        if (team.hierarchy?.reportingChain[agentId]?.length) {
            throw new Error(`Cannot remove manager ${agentId} with active reports`);
        }

        // Remove from active collaborations
        for (const collab of this.collaborations.values()) {
            if (collab.status === 'active' && collab.participants.includes(agentId)) {
                collab.participants = collab.participants.filter(id => id !== agentId);
                if (collab.participants.length === 0) {
                    await this.endCollaboration(collab.id, 'No active participants');
                }
            }
        }

        // Remove member
        team.members = team.members.filter(m => m.agentId !== agentId);
        this.teams.set(teamId, team);
    }

    async startCollaboration(collaboration: Collaboration): Promise<void> {
        const team = this.teams.get(collaboration.teamId);
        if (!team) {
            throw new Error(`Team ${collaboration.teamId} not found`);
        }

        // Validate participants are team members
        for (const participantId of collaboration.participants) {
            if (!team.members.some(m => m.agentId === participantId)) {
                throw new Error(`Participant ${participantId} not found in team`);
            }
        }

        collaboration.status = 'active';
        this.collaborations.set(collaboration.id, collaboration);
    }

    async endCollaboration(id: string, summary: string): Promise<void> {
        const collaboration = this.collaborations.get(id);
        if (!collaboration) {
            throw new Error(`Collaboration ${id} not found`);
        }

        collaboration.status = 'completed';
        collaboration.context.sharedKnowledge['summary'] = summary;
        this.collaborations.set(id, collaboration);
    }

    async broadcastMessage(teamId: string, message: Message): Promise<void> {
        const team = this.teams.get(teamId);
        if (!team) {
            throw new Error(`Team ${teamId} not found`);
        }

        // Get active members
        const activeMembers = team.members.filter(m => m.status === 'active');

        // Send message to each member's handler
        const promises = activeMembers.map(async member => {
            const handler = this.messageHandlers.get(member.agentId);
            if (handler) {
                try {
                    await handler(message);
                } catch (error) {
                    console.error(`Failed to send message to ${member.agentId}:`, error);
                }
            }
        });

        await Promise.all(promises);
    }

    async getTeamStatus(teamId: string): Promise<{
        activeMembers: number;
        currentCollaborations: number;
        teamMetrics: Record<string, number>;
    }> {
        const team = this.teams.get(teamId);
        if (!team) {
            throw new Error(`Team ${teamId} not found`);
        }

        // Calculate metrics
        const activeMembers = team.members.filter(m => m.status === 'active').length;
        const currentCollaborations = Array.from(this.collaborations.values())
            .filter(c => c.teamId === teamId && c.status === 'active').length;

        // Calculate role distribution
        const roleDistribution: Record<string, number> = {};
        team.members.forEach(member => {
            roleDistribution[member.role.name] = (roleDistribution[member.role.name] || 0) + 1;
        });

        return {
            activeMembers,
            currentCollaborations,
            teamMetrics: {
                totalMembers: team.members.length,
                ...roleDistribution,
                hierarchyDepth: this.calculateHierarchyDepth(team)
            }
        };
    }

    // Helper method to register message handlers for agents
    async registerMessageHandler(
        agentId: string,
        handler: (message: Message) => Promise<void>
    ): Promise<void> {
        this.messageHandlers.set(agentId, handler);
    }

    private calculateHierarchyDepth(team: AgentTeam): number {
        if (!team.hierarchy) return 1;

        const visited = new Set<string>();
        const findMaxDepth = (agentId: string): number => {
            if (visited.has(agentId)) return 0;
            visited.add(agentId);

            const reports = team.hierarchy!.reportingChain[agentId] || [];
            if (reports.length === 0) return 1;

            return 1 + Math.max(...reports.map(findMaxDepth));
        };

        return findMaxDepth(team.hierarchy.leaderId);
    }
} 