@@ .. @@
-                      <SubscriptionFeatureBlock
-                        isBlocked={isFreePlan}
-                        featureName="Mood tracking"
-                      >
+                      <SubscriptionFeatureBlock featureName="Mood tracking">
                         <button
                           onClick={() => handleMoodEntry(patient.id)}
                           disabled={!!patient.todaysMood || isFreePlan}
@@ .. @@
 
           {/* Mood Entry Modal */}
           <MoodEntryModal
-            isOpen={showMoodModal && !isFreePlan}
+            isOpen={showMoodModal}
             onClose={() => {
               setShowMoodModal(false);
               setSelectedPatientId(null);
@@ .. @@
             patientId={selectedPatientId || ''}
             onSuccess={refreshPatientData}
+            viewOnly={isFreePlan}
           />
         </div>
       </Layout>
     );
   }
 }