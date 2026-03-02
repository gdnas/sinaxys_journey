// Teste para validar os shapes de retorno das funções
// Execute: npx tsx test -- src/test-shape-validation.ts

import { listPublicProfiles } from "@/lib/pointsDb";
import { listTasksByDeliverableIds } from "@/lib/okrDb";

async function runTests() {
  console.log("=== INICIANDO TESTES DE SHAPE ===");

  // Teste A: listPublicProfiles
  console.log("\n1️⃣ Testando listPublicProfiles...");
  try {
    const profiles = await listPublicProfiles("test-company-id");
    console.log(`   Quantidade de profiles retornados: ${profiles.length}`);
    
    if (profiles.length > 0) {
      const firstProfile = profiles[0];
      console.log("   Primeiro profile retornado:", {
        id: typeof firstProfile.id,
        idValue: firstProfile.id,
        has_manager_id: "manager_id" in firstProfile,
        manager_id_type: typeof firstProfile.manager_id,
        manager_id_value: firstProfile.manager_id,
        has_job_title: "job_title" in firstProfile,
        job_title_type: typeof firstProfile.job_title,
        job_title_value: firstProfile.job_title,
      });
      
      // Verificar se os campos obrigatórios estão presentes
      const requiredFields = ["id", "company_id", "department_id", "name", "avatar_url", "role", "active", "updated_at", "manager_id", "job_title"];
      const missingFields = requiredFields.filter(field => !(field in firstProfile));
      
      if (missingFields.length > 0) {
        console.error("   ❌ Campos ausentes:", missingFields);
      } else {
        console.log("   ✅ Todos os campos obrigatórios presentes");
      }
      
      // Verificar se tipos estão corretos
      const typeChecks = {
        id: typeof firstProfile.id === "string",
        company_id: typeof firstProfile.company_id === "string",
        department_id: firstProfile.department_id === null || typeof firstProfile.department_id === "string",
        name: typeof firstProfile.name === "string",
        avatar_url: firstProfile.avatar_url === null || typeof firstProfile.avatar_url === "string",
        role: typeof firstProfile.role === "string",
        active: typeof firstProfile.active === "boolean",
        updated_at: typeof firstProfile.updated_at === "string",
        manager_id: firstProfile.manager_id === null || typeof firstProfile.manager_id === "string",
        job_title: firstProfile.job_title === null || typeof firstProfile + ".job_title" === "string",
      };
      
      const failedTypeChecks = Object.entries(typeChecks).filter(([key, value]) => !value);
      if (failedTypeChecks.length > 0) {
        console.error("   ❌ Tipos incorretos:", failedTypeChecks.map(([key]) => `  ${key}`));
      } else {
        console.log("   ✅ Todos os tipos corretos");
      }
    }
  } catch (error) {
    console.error("   ❌ Erro ao testar listPublicProfiles:", error);
  }

  // Teste B: listTasksByDeliverableIds
  console.log("\n2️⃣ Testando listTasksByDeliverableIds...");
  try {
    const tasks = await listTasksByDeliverableIds(["test-deliverable-id"]);
    console.log(`   Quantidade de tarefas retornadas: ${tasks.length}`);
    
    if (tasks.length > 0) {
      const firstTask = tasks[0];
      console.log("   Primeira tarefa retornada:", {
        id: typeof firstTask.id,
        has_title: typeof "title" in firstTask,
        has_deliverable_id: typeof "deliverable_id" in firstTask,
        has_owner_user_id: typeof "owner_user_id" in firstTask,
        has_status: typeof "status" in firstTask,
      });
      
      // Verificar se campos estão presentes
      const requiredTaskFields = ["id", "deliverable_id", "title", "owner_user_id", "status"];
      const missingTaskFields = requiredTaskFields.filter(field => !(field in firstTask));
      
      if (missingTaskFields.length > 0) {
        console.error("   ❌ Campos ausentes:", missingTaskFields);
      } else {
        console.log("   ✅ Todos os campos obrigatórios presentes");
      }
      
      // Verificar tipos
      const typeTaskChecks = {
        id: typeof firstTask.id === "string",
        deliverable_id: typeof firstTask.deliverable_id === "string",
        title: typeof firstTask.title === "string",
        owner_user_id: typeof firstTask.owner_user_id === "string",
        status: typeof firstTask.status === "string",
      };
      
      const failedTaskTypeChecks = Object.entries(typeTaskChecks).filter(([key, value]) => !value);
      if (failedTaskTypeChecks.length > 0) {
        console.error("   ❌ Tipos incorretos:", failedTaskTypeChecks.map(([key]) => ` ${key}`));
      } else {
        console.log("   === FIM DOS TESTES ===");
      }
    }
  } catch (error) {
    console.error("   ❌ Erro ao testar listTasksByDeliverableIds:", error);
  }
}

// Executar testes no console do navegador
runTests();