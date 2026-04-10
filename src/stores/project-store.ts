import { create } from "zustand";
import type { ProjectDto, CreateProjectRequest, UpdateProjectRequest } from "@/types";
import * as ipc from "@/lib/ipc";

interface ProjectState {
  projects: ProjectDto[];
  currentProject: ProjectDto | null;
  isLoading: boolean;
  loadProjects: (search?: string, projectType?: string) => Promise<void>;
  createProject: (req: CreateProjectRequest) => Promise<ProjectDto>;
  openProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  updateProject: (req: UpdateProjectRequest) => Promise<ProjectDto>;
  updateThumbnail: (id: string, thumbnailPath?: string | null) => Promise<void>;
}

export const useProjectStore = create<ProjectState>()((set) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  loadProjects: async (search?: string, projectType?: string) => {
    set({ isLoading: true });
    try {
      const projects = await ipc.listProjects(search, projectType);
      set({ projects });
    } finally {
      set({ isLoading: false });
    }
  },
  createProject: async (req) => {
    const project = await ipc.createProject(req);
    set((state) => ({ projects: [project, ...state.projects] }));
    return project;
  },
  openProject: async (id) => {
    const project = await ipc.openProject(id);
    set({ currentProject: project });
  },
  deleteProject: async (id) => {
    await ipc.deleteProject(id);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
    }));
  },
  updateProject: async (req) => {
    const updated = await ipc.updateProject(req);
    set((state) => ({
      projects: state.projects.map((p) => (p.id === req.id ? updated : p)),
      currentProject: state.currentProject?.id === req.id ? updated : state.currentProject,
    }));
    return updated;
  },
  updateThumbnail: async (id, thumbnailPath) => {
    const updated = await ipc.updateProjectThumbnail(id, thumbnailPath);
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? updated : p)),
      currentProject: state.currentProject?.id === id ? updated : state.currentProject,
    }));
  },
}));
