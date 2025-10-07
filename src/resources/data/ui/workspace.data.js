/**
 * Datos para las operaciones de Workspace en Trello
 * Este archivo contiene la data utilizada en las pruebas de Workspace
 */

class WorkspaceData {
    /**
     * Datos para crear un nuevo workspace
     */
    static getNewWorkspaceData() {
        return {
            name: `Mi Workspace Test ${Date.now()}`,
            description: 'Workspace creado automáticamente para pruebas',
            type: 'marketing'
        };
    }

    /**
     * Datos para workspace por tipo
     */
    static getWorkspaceByType(type = 'general') {
        const workspaceTypes = {
            general: {
                name: `Workspace General ${Date.now()}`,
                description: 'Workspace para uso general',
                type: 'general'
            },
            marketing: {
                name: `Workspace Marketing ${Date.now()}`,
                description: 'Workspace para equipo de marketing',
                type: 'marketing'
            },
            engineering: {
                name: `Workspace Engineering ${Date.now()}`,
                description: 'Workspace para equipo de ingeniería',
                type: 'engineering'
            },
            operations: {
                name: `Workspace Operations ${Date.now()}`,
                description: 'Workspace para operaciones',
                type: 'operations'
            }
        };

        return workspaceTypes[type] || workspaceTypes.general;
    }

    /**
     * Datos para editar workspace existente
     */
    static getEditWorkspaceData() {
        return {
            newName: `Workspace Editado ${Date.now()}`,
            newDescription: 'Workspace modificado para pruebas',
            newType: 'operations'
        };
    }

    /**
     * Datos inválidos para pruebas de validación
     */
    static getInvalidWorkspaceData() {
        return {
            emptyName: {
                name: '',
                description: 'Workspace sin nombre',
                type: 'general'
            },
            longName: {
                name: 'A'.repeat(101), // Nombre muy largo
                description: 'Workspace con nombre muy largo',
                type: 'general'
            },
            specialCharacters: {
                name: 'Workspace @#$%^&*()',
                description: 'Workspace con caracteres especiales',
                type: 'general'
            }
        };
    }

    /**
     * Datos para workspace con miembros
     */
    static getWorkspaceWithMembers() {
        return {
            name: `Workspace Team ${Date.now()}`,
            description: 'Workspace con configuración de miembros',
            type: 'engineering',
            members: {
                admin: 'admin@example.com',
                normal: 'member@example.com',
                observer: 'observer@example.com'
            }
        };
    }

    /**
     * Datos para workspace con preferencias
     */
    static getWorkspaceWithPreferences() {
        return {
            name: `Workspace Prefs ${Date.now()}`,
            description: 'Workspace con preferencias específicas',
            type: 'marketing',
            preferences: {
                visibility: 'private',
                enablePlugins: true,
                allowExternalMembers: false,
                boardCreationRestricted: true
            }
        };
    }

    /**
     * Obtener workspace por ID (para casos donde necesitas referencia)
     */
    static getWorkspaceById(workspaceId) {
        return {
            id: workspaceId,
            name: `Workspace ${workspaceId}`,
            description: `Workspace con ID: ${workspaceId}`,
            type: 'general'
        };
    }
}

module.exports = WorkspaceData;