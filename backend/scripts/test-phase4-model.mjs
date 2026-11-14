// backend/scripts/test-phase4-model.mjs
// Test for Phase 4.2 Application Data Model Extension

import mongoose from 'mongoose';
import { Application } from '../dist/models/application.model.js';
import { User } from '../dist/models/user.model.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}
const MONGODB_URI = process.env.MONGODB_URI;

async function testApplicationModel() {
  console.log('========================================================');
  console.log('  TESTING PHASE 4.2 EXTENDED APPLICATION DATA MODEL     ');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(cond, name, msg = '') {
    if (cond) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name} - ${msg}`);
      failed++;
    }
  }

  try {
    console.log('[STEP 1] Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    });
    assert(mongoose.connection.readyState === 1, 'MongoDB Atlas connected successfully');

    // Create a temporary applicant user
    const tempEmail = `model_tester_${Date.now()}@example.com`;
    const tempUser = await User.create({
      name: 'Model Tester',
      email: tempEmail,
      password: 'HashedPassword123!',
      role: 'applicant',
    });
    assert(Boolean(tempUser._id), 'Temporary test user created in Atlas');

    // Create extended application
    console.log('\n[STEP 2] Creating Application with Extended Phase 4 Schema...');
    const testApp = await Application.create({
      applicantId: tempUser._id,
      visaCategory: 'EB-2-NIW',
      title: 'AI Robotics National Interest Waiver Petition',
      status: 'draft',
      draftStep: 2,
      concurrencyVersion: 1,
      applicantDetails: {
        fullName: 'Dr. Model Tester',
        dateOfBirth: '1988-06-15',
        nationality: 'Indian',
        email: tempEmail,
        phone: '+1 (555) 234-5678',
        currentImmigrationStatus: 'H-1B',
        alienRegistrationNumber: 'A-205948372',
      },
      educationDetails: {
        highestQualification: 'Ph.D. in Computer Science & Robotics',
        institution: 'Carnegie Mellon University',
        fieldOfStudy: 'Autonomous Systems',
        graduationYear: 2018,
        foreignDegreeEvaluated: true,
        degreeEvaluationAgency: 'Trustforte / WES',
      },
      employmentDetails: {
        currentEmployer: 'RoboDynamics Labs Inc.',
        jobTitle: 'Principal Research Scientist',
        annualSalary: 210000,
        workLocationCity: 'Pittsburgh',
        workLocationState: 'PA',
        yearsOfExperience: 9,
        dutiesSummary: 'Leading multi-agent pathfinding and robotic manipulation research.',
      },
      categorySpecificDetails: {
        proposedEndeavorTitle: 'Next-Generation Autonomous Surgical Robotics',
        proposedEndeavorDescription: 'Advancing precision micro-robotics for remote surgical interventions.',
        prong1SubstantialMerit: 'Transformative impact on rural healthcare access across the United States.',
        prong2WellPositioned: '1,400+ citations, 3 granted US patents, and NIH research grant PI.',
        prong3NationalImportance: 'Urgent national interest in surgical access without PERM delay.',
        expertLettersCount: 6,
      },
    });

    assert(Boolean(testApp._id), 'Extended application created in MongoDB Atlas');
    assert(testApp.applicantDetails?.fullName === 'Dr. Model Tester', 'applicantDetails subdocument persisted');
    assert(testApp.educationDetails?.institution === 'Carnegie Mellon University', 'educationDetails subdocument persisted');
    assert(testApp.employmentDetails?.annualSalary === 210000, 'employmentDetails subdocument persisted');
    assert(testApp.categorySpecificDetails?.expertLettersCount === 6, 'categorySpecificDetails subdocument persisted');
    assert(Array.isArray(testApp.checklist) && testApp.checklist.length >= 4, 'Pre-save populated preliminary checklist');
    assert(Array.isArray(testApp.statusHistory) && testApp.statusHistory.length >= 1, 'Pre-save initialized statusHistory audit entry');
    assert(typeof testApp.progressPercentage === 'number', 'Pre-save calculated initial progressPercentage');

    // Update status and append to status history
    console.log('\n[STEP 3] Updating Status with Audit Trail...');
    testApp.status = 'evidence_pending';
    testApp.statusHistory.push({
      status: 'evidence_pending',
      changedAt: new Date(),
      reason: 'Questionnaire completed, gathering supporting documents.',
    });
    testApp.concurrencyVersion += 1;
    await testApp.save();

    const fetchedApp = await Application.findById(testApp._id);
    assert(fetchedApp?.status === 'evidence_pending', 'Application status updated to evidence_pending');
    assert(fetchedApp?.statusHistory.length === 2, 'statusHistory audit log contains 2 entries');
    assert(fetchedApp?.concurrencyVersion === 2, 'concurrencyVersion incremented successfully');

    // Clean up
    console.log('\n[STEP 4] Cleaning Up Test Records...');
    await Application.findByIdAndDelete(testApp._id);
    await User.findByIdAndDelete(tempUser._id);
    assert(true, 'Test records cleaned up cleanly from Atlas');

    console.log('\n========================================================');
    console.log(`  MODEL TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================\n');

    await mongoose.disconnect();

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Model test failed with error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testApplicationModel();
