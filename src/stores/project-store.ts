import { create } from "zustand";
import type { ProjectDto, CreateProjectRequest } from "@/types";
import * as ipc from "@/lib/ipc";

interface ProjectState {
  projects: ProjectDto[];
  currentProject: ProjectDto | null;
  isLoading: boolean;
  loadProjects: () => Promise<void>;
  createProject: (req: CreateProjectRequest) => Promise<ProjectDto>;
  openProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>()((set) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  loadProjects: async () => {
    set({ isLoading: true });
    const projects = await ipc.listProjects();
    set({ projects, isLoading: false });
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
}));
