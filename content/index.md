# FreeSurfer Documentation Project — Index

Target version: **FreeSurfer 8.2.0**

This is the master inventory of the FreeSurfer Documentation Project wiki.
Each entry links to a page that documents a single tool, concept, pipeline,
format, or gotcha. Pages are authored from the FreeSurfer source tree and
cross-verified against the official [FreeSurfer wiki](https://surfer.nmr.mgh.harvard.edu/fswiki/)
and mailing list archives.

Status legend: ✅ verified · 🔎 review · 📝 draft · ⬜ not started

---

## Pipelines

| Pipeline | Summary | Status |
|----------|---------|--------|
| [[recon-all]] | The canonical cortical reconstruction pipeline (autorecon1/2/3) | 📝 draft |
| [[infant-recon-all]] | Infant FreeSurfer pipeline: k-NN MRF label fusion + NIftyReg surfaces for T1w data, ages 0–4.5 years | 📝 draft |

## Concepts

| Concept | Summary | Status |
|---------|---------|--------|
| [[coordinate-systems]] | Deep reference: CRS, Scanner RAS, Surface (tkreg) RAS, MNI305 ("Talairach"), MNI152; all inter-space transforms | 🔎 review |
| [[surface-representations]] | White, pial, inflated, sphere, sphere.reg surfaces; cortical ribbon; vertex correspondence; TH3 volume method | 🔎 review |
| [[registration-overview]] | Talairach/MNI305 affine; GCA atlas; surface spherical registration; register.dat and LTA formats | 🔎 review |
| [[parcellation-schemes]] | Desikan-Killiany (DK40), Destrieux (a2009s), DKTatlas: atlas parcellation schemes, ctab conventions, label offsets | 🔎 review |
| [[longitudinal-processing]] | Longitudinal pipeline: base subject, TP subjects, unbiased template creation, long flags | 🔎 review |
| [[topology-correction]] | Euler number, surface defects, mris_fix_topology / mris_topo_fixer, sphere-based correction | 🔎 review |
| [[color-lut]] | FreeSurferColorLUT.txt: the global label scheme, segmentation label integers, hemisphere offsets | 🔎 review |
| [[fsaverage]] | The fsaverage average brain (40 subjects, ic7, 163,842 vertices/hemi); creation, atlas space, group analysis | 🔎 review |

## File Formats

| Format | Summary | Status |
|--------|---------|--------|
| [[mgz]] | FreeSurfer native volume format (MGH/MGZ): binary layout, voxel types, RAS geometry block, TAG footer | 🔎 review |
| [[surface-format]] | Binary triangle file for cortical meshes: magic numbers, vertex/face layout, TAG section | 🔎 review |
| [[curv-format]] | Per-vertex scalar overlay (.curv): new and old format, magic, float32 values | 🔎 review |
| [[mrisp-tif]] | MRISP spherical parameterization image (.tif): multi-page TIFF with (mean, variance, dof) frame triplets | 🔎 review |
| [[gcsa-format]] | Gaussian Classifier Surface Array (.gcs): Bayesian per-vertex classifier on icosahedral spheres | 🔎 review |
| [[subject-directory]] | Full specification of the FreeSurfer subject directory layout | 🔎 review |
| [[lta-format]] | Linear Transform Array (.lta): all 9 type codes, ASCII file layout, VOL_GEOM block, register.dat subsection | 🔎 review |
| [[annotation-format]] | Cortical parcellation annotation (.annot): binary per-vertex labels, RGB-packed encoding, embedded ctab | 🔎 review |
| [[label-format]] | Vertex/voxel label file (.label): ASCII format, surface vs volume labels, TkReg RAS coordinates | 🔎 review |
| [[ctab-format]] | Color table / LUT (.ctab): ASCII and binary forms, FreeSurferColorLUT.txt, label range conventions | 🔎 review |
| [[gca-format]] | Gaussian Classifier Atlas (.gca): GCA volumetric atlas binary format; node/prior grid, big-endian layout, version 5.0 | 🔎 review |
| [[stats-format]] | FreeSurfer statistics file (.stats): aseg.stats/aparc.stats text format, header measures, column definitions | 🔎 review |
| [[m3z-format]] | GCA Morph warp field (.m3z): gzip-compressed node array (36 B/node), tagged sections, coordinate conventions | 🔎 review |

## Volumetric Tools (`mri_*`)

| Tool                                    | Summary                                                                                              | Language     | Status    |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------ | --------- |
| [[mri_3d_photo_recon]]                  | reconstructs a 3D volume from a stack of 2D photographs of brain slabs                               | shell        | 📝 draft  |
| [[mri_WMHsynthseg]]                     | is a deep learning tool for joint segmentation of brain anatomy and white matter hyperintensities (W | Python       | 📝 draft  |
| [[mri_and]]                             | performs a logical voxel-wise AND across a series of two or more MRI volumes that must share the sam | C++          | 📝 draft  |
| [[mri_annotation2label]]                | converts a cortical parcellation annotation file (`                                                  | C++          | 📝 draft  |
| [[mri_aparc2aseg]]                      | projects the cortical parcellation labels from [[mris_ca_label]] (stored as surface annotations on ` | C++          | 🔎 review |
| [[mri_aparc2wmseg]]                     | creates a white-matter parcellation volume by projecting the cortical surface annotation (`aparc`) o | C++          | 📝 draft  |
| [[mri_apply_autoencoder]]               | applies a trained Stacked Autoencoder (SAE) model to an MRI volume for unsupervised feature extracti | C++          | 📝 draft  |
| [[mri_apply_bias]]                      | applies a pre-computed bias (gain) field to an input MRI volume by performing voxel-wise multiplicat | C++          | 📝 draft  |
| [[mri_apply_inu_correction]]            | estimates a per-voxel intensity non-uniformity (INU) gain field from a reference pair of volumes (th | C++          | 📝 draft  |
| [[mri_aseg_edit_reclassify]]            | uses a pre-trained Support Vector Machine (SVM) classifier to automatically reclassify border voxels | C++          | 📝 draft  |
| [[mri_aseg_edit_train]]                 | trains a Support Vector Machine (SVM) or Gaussian classifier to learn the difference between an auto | C++          | 📝 draft  |
| [[mri_auto_fill]]                       | automatically fills the white matter volume by applying atlas-based hemisphere templates to a skull- | C++          | 📝 draft  |
| [[mri_average]]                         | computes a voxel-wise average (or RMS) of two or more MRI volumes, optionally after conforming them  | C++          | 📝 draft  |
| [[mri_bc_sc_bias_correct]]              | is an MRI bias field correction tool found in the `attic/` directory of the FreeSurfer source tree   | C++          | 📝 draft  |
| [[mri_binarize]]                        | applies thresholding, label matching, and morphological operations to volume files                   | C++          | 🔎 review |
| [[mri_brain_volume]]                    | is a brain volume estimation tool located in the `mri_watershed/brain_volume/` subdirectory          | C++          | 📝 draft  |
| [[mri_brainvol_stats]]                  | computes a standardized set of whole-brain volume statistics for a given subject and writes them to  | C++          | 📝 draft  |
| [[mri_cc]]                              | adds corpus callosum (CC) labels to an existing aseg segmentation, subdividing the callosum into fiv | C++          | 📝 draft  |
| [[mri_cht2p]]                           | is a small utility in the `attic/` directory that reads and writes Cluster Height Table (CHT) files  | C++          | 📝 draft  |
| [[mri_classify]]                        | trains or applies an MRI voxel classifier using intensity features                                   | C++          | 📝 draft  |
| [[mri_claustrum_seg]]                   | segments the bilateral claustrum from an MRI volume using a deep learning model                      | tcsh         | 📝 draft  |
| [[mri_cluster]]                         | performs connected-component clustering on a thresholded MRI overlay (volume or surface), grouping s | C++          | 📝 draft  |
| [[mri_cnr]]                             | computes the Contrast-to-Noise Ratio (CNR) between white matter and gray matter using FreeSurfer sur | C++          | 📝 draft  |
| [[mri_compile_edits]]                   | scans a subject's `mri/` directory for all manually-edited volumes and produces a single summary vol | C++          | 📝 draft  |
| [[mri_compute_bias]]                    | estimates the MRI bias field (intensity inhomogeneity) by comparing an input volume against a refere | C++          | 📝 draft  |
| [[mri_compute_change_map]]              | computes a voxelwise longitudinal change map between two registered MRI volumes                      | C++          | 📝 draft  |
| [[mri_compute_distances]]               | computes the average Hausdorff distance (or centroid distance) between corresponding labelled region | C++          | 📝 draft  |
| [[mri_compute_layer_fractions]]         | computes the fractional contributions of six cortical laminar compartments (layers 1–6), white matte | C++          | 📝 draft  |
| [[mri_compute_overlap]]                 | computes three label-overlap measures — volume difference, Dice coefficient, and Jaccard index — bet | C++          | 📝 draft  |
| [[mri_compute_seg_overlap]]             | computes Dice and Jaccard overlap coefficients between two segmentation volumes, targeting a fixed d | C++          | 📝 draft  |
| [[mri_compute_structure_transforms]]    | computes the optimal per-structure linear (affine) transform for each anatomical label in a non-line | C++          | 📝 draft  |
| [[mri_compute_volume_fractions]]        | estimates the partial volume fractions of cortical gray matter, subcortical gray matter, white matte | C++          | 📝 draft  |
| [[mri_compute_volume_intensities]]      | computes "unpartial-volumed" intensity estimates for each tissue type (white matter, cortical gray,  | C++          | 📝 draft  |
| [[mri_concat]]                          | concatenates multiple volume files along the frame (4th) dimension, producing a single multi-frame o | C++          | 🔎 review |
| [[mri_convert]]                         | is FreeSurfer's Swiss-army knife for moving volumetric data between formats and for applying basic,  | C++          | 📝 draft  |
| [[mri_convert_mdh]]                     | converts Siemens raw MRI data files using the Measurement Data Header (MDH) mini-header format       | C++          | 📝 draft  |
| [[mri_copy_params]]                     | copies volume header parameters (geometry, acquisition parameters, or both) from a template volume o | C++          | 📝 draft  |
| [[mri_copy_values]]                     | copies voxels with a specific label value from a source volume into a destination volume, overwritin | C++          | 📝 draft  |
| [[mri_cor2label]]                       | converts voxel values in any volume or surface overlay to a FreeSurfer label file (`                 | C++          | 📝 draft  |
| [[mri_correct_segmentations]]           | applies a multi-pass post-hoc correction pipeline to an automated segmentation volume                | C++          | 📝 draft  |
| [[mri_create_t2combined]]               | combines two or three T2*-weighted 7T partial-brain volumes (upper, optional middle, lower) into a s | shell (tcsh) | 📝 draft  |
| [[mri_create_tests]]                    | generates modified test images from an input volume by applying random geometric transforms (transla | C++          | 📝 draft  |
| [[mri_ctab_fix]]                        | is a color table (LUT) management utility with four modes: check a single LUT for duplicate annotati | C++          | 📝 draft  |
| [[mri_deface]]                          | removes facial features from an MRI volume to protect subject privacy                                | C++          | 📝 draft  |
| [[mri_defacer]]                         | is a newer FreeSurfer tool for removing facial features from MRI volumes                             | C++          | 📝 draft  |
| [[mri_diff]]                            | determines whether two MRI volumes differ and in what way                                            | C++          | 📝 draft  |
| [[mri_dist_surf_label]]                 | computes the distance from a surface to a set of points specified in a label file (used as waypoints | C++          | 📝 draft  |
| [[mri_distance_transform]]              | computes the Euclidean distance transform from a binary label in a volume                            | C++          | 📝 draft  |
| [[mri_divide_segmentation]]             | splits a labelled segmentation region into a specified number of sub-parts along the principal axis  | C++          | 📝 draft  |
| [[mri_dualperm]]                        | performs dual permutation tests and related spatial correlation analyses on two MRI dataset "modes"  | C++          | 📝 draft  |
| [[mri_edit_segmentation]]               | applies a set of rule-based post-processing corrections to an existing volumetric segmentation (such | C++          | 📝 draft  |
| [[mri_edit_segmentation_with_surfaces]] | refines a volumetric segmentation (aseg) by correcting voxels that are geometrically inconsistent wi | C++          | 📝 draft  |
| [[mri_edit_wm_with_aseg]]               | uses the aseg (automatic subcortical segmentation) volume as an anatomical prior to correct the whit | C++          | 📝 draft  |
| [[mri_elastic_energy]]                  | computes the elastic (Lamé constant) energy of a GCA morph (GCAM) deformation field                  | C++          | 📝 draft  |
| [[mri_entowm_seg]]                      | is a tcsh wrapper script that segments the entorhinal cortex white matter (EntoWM) region using a de | tcsh         | 📝 draft  |
| [[mri_estimate_tissue_parms]]           | estimates quantitative tissue parameters — specifically proton density (PD) and longitudinal relaxat | C++          | 📝 draft  |
| [[mri_evaluate_morph]]                  | evaluates the quality of a volumetric registration (morph) by computing the pairwise overlap of segm | C++          | 📝 draft  |
| [[mri_extract]]                         | extracts a rectangular sub-volume (region of interest) from an input MRI volume                      | C++          | 📝 draft  |
| [[mri_extract_conditions]]              | extracts condition-specific frames from a 4D fMRI time-series volume based on a paradigm file that a | C++          | 📝 draft  |
| [[mri_extract_fcd_features]]            | extracts per-vertex (surface-based) and per-voxel features from a reconstructed FreeSurfer subject d | C++          | 📝 draft  |
| [[mri_extract_label]]                   | creates a binary or label-value output volume containing only the voxels that match one or more spec | C++          | 📝 draft  |
| [[mri_extract_largest_CC]]              | extracts the largest connected component from a binary segmentation volume and writes it to an outpu | C++          | 📝 draft  |
| [[mri_exvivo_norm]]                     | applies a deep learning-based intensity normalization to ex vivo MRI data (post-mortem brain tissue) | Python       | 📝 draft  |
| [[mri_exvivo_strip]]                    | performs deep learning-based skull/tissue stripping on ex vivo MRI data                              | Python       | 📝 draft  |
| [[mri_fcili]]                           | computes the Intrinsic Laterality Index (iLI) from paired left- and right-hemisphere functional conn | C++          | 📝 draft  |
| [[mri_fdr]]                             | applies False Discovery Rate (FDR) correction to one or more statistical maps                        | C++          | 📝 draft  |
| [[mri_fieldsign]]                       | computes visual field sign maps from retinotopic phase data on a cortical surface                    | C++          | 📝 draft  |
| [[mri_fill]]                            | takes the white matter (WM) segmentation volume and creates a filled WM volume where the two cerebra | C++          | 📝 draft  |
| [[mri_fit_bias]]                        | estimates and corrects spatial intensity bias field in MRI volumes by fitting a parametric model (Di | C++          | 📝 draft  |
| [[mri_fuse_intensity_images]]           | fuses intensity images from multiple longitudinal timepoints into a single normalized volume         | C++          | 📝 draft  |
| [[mri_fuse_segmentations]]              | fuses multiple cross-sectional segmentation volumes (asegs) from different time points into a single | C++          | 📝 draft  |
| [[mri_fwhm]]                            | estimates the global Gaussian smoothness (Full-Width-Half-Maximum, FWHM) of a multi-frame volumetric | C++          | 📝 draft  |
| [[mri_gcut]]                            | performs graph-cut skull stripping of a T1-weighted MRI volume                                       | C++          | 📝 draft  |
| [[mri_gdfglm]]                          | performs a general linear model (GLM) analysis given a FreeSurfer Group Descriptor File (GDF/FSGD) a | C++          | 📝 draft  |
| [[mri_glmfit]]                          | is FreeSurfer's primary tool for voxel- or vertex-wise general linear model (GLM) analysis           | C++          | 📝 draft  |
| [[mri_glmfit-sim]]                      | performs multiple-comparisons correction on the output of [[mri_glmfit]] using Monte Carlo simulatio | shell        | 📝 draft  |
| [[mri_gradient_info]]                   | computes and reports gradient information from an MRI volume, specifically analyzing the spatial gra | C++          | 📝 draft  |
| [[mri_gradunwarp]]                      | corrects gradient non-linearity distortions in MRI volumes and surfaces                              | C++          | 📝 draft  |
| [[mri_gtmpvc]]                          | performs partial volume correction (PVC) on PET data using the Geometric Transfer Matrix (GTM) metho | C++          | 📝 draft  |
| [[mri_gtmseg]]                          | creates the anatomical segmentation volume used by [[mri_gtmpvc]] for Geometric Transfer Matrix (GTM | C++          | 📝 draft  |
| [[mri_hausdorff_dist]]                  | computes the modified (mean) Hausdorff distance or the maximum Hausdorff distance between binary lab | C++          | 📝 draft  |
| [[mri_head]]                            | is a utility that can identify MRI file format types (`-identify`) or read volume header information | C++          | 📝 draft  |
| [[mri_histo_atlas_segment_fireants]]    | performs Bayesian segmentation of in vivo MRI using a probabilistic histological whole-brain atlas,  | shell        | 📝 draft  |
| [[mri_histo_eq]]                        | performs histogram equalization of a source MRI volume to match the intensity distribution of a temp | C++          | 📝 draft  |
| [[mri_histo_normalize]]                 | performs iterative histogram-based intensity normalization of a set of MRI volumes to a common refer | C++          | 📝 draft  |
| [[mri_ibmc]]                            | performs Intersection-Based Motion Correction (IBMC) of MRI volumes, based on the algorithm describe | C++          | 📝 draft  |
| [[mri_info]]                            | reads one or more MRI volume files and dumps metadata to stdout                                      | C++          | 🔎 review |
| [[mri_interpolate]]                     | interpolates missing or sparse values in an MRI volume using spatial averaging                       | C++          | 📝 draft  |
| [[mri_jacobian]]                        | computes the Jacobian determinant of a nonlinear morphological deformation field (stored as a GCAM / | C++          | 📝 draft  |
| [[mri_joint_density]]                   | computes the joint intensity density (2D joint histogram) of two co-registered MRI volumes           | C++          | 📝 draft  |
| [[mri_label2label]]                     | converts a surface label defined in one subject's space to a corresponding label in another subject' | C++          | 📝 draft  |
| [[mri_label2vol]]                       | rasterizes surface labels, surface annotation files, or volumetric segmentation files into a volumet | C++          | 🔎 review |
| [[mri_label_accuracy]]                  | computes the accuracy of a segmentation label volume compared to a reference (ground truth) volume   | C++          | 📝 draft  |
| [[mri_label_fusion]]                    | performs multi-atlas label fusion to create a segmentation from multiple registered atlas label maps | Python       | 📝 draft  |
| [[mri_label_histo]]                     | computes and plots the intensity histogram of voxels belonging to a specific label in a segmentation | C++          | 📝 draft  |
| [[mri_label_vals]]                      | extracts intensity values from a volume at the locations defined by a label (`                       | C++          | 📝 draft  |
| [[mri_label_volume]]                    | computes the volume (in mm³) of one or more labelled regions in a segmentation volume                | C++          | 📝 draft  |
| [[mri_long_normalize]]                  | performs intensity normalisation for the longitudinal FreeSurfer pipeline                            | C++          | 📝 draft  |
| [[mri_make_bem_surfaces]]               | creates Boundary Element Method (BEM) surfaces for use with MEG/EEG forward modelling tools (e       | C++          | 📝 draft  |
| [[mri_make_density_map]]                | applies a spatial transform (optionally with Jacobian correction) to a segmentation volume with part | C++          | 📝 draft  |
| [[mri_make_labels]]                     | segments a volume by thresholding, identifies connected components, removes small segments below a s | C++          | 📝 draft  |
| [[mri_make_register]]                   | creates a `register                                                                                  | C++          | 📝 draft  |
| [[mri_make_template]]                   | builds a multi-subject anatomical template by accumulating voxel-wise statistics (mean, variance) fr | C++          | 📝 draft  |
| [[mri_make_uchar]]                      | converts an MRI volume to 8-bit unsigned character (uchar) format with white-matter-anchored intensi | C++          | 📝 draft  |
| [[mri_map_cpdat]]                       | maps a FreeSurfer control point file (`control                                                       | C++          | 📝 draft  |
| [[mri_maps2csd]]                        | converts surface-based statistical maps into Cluster Size Distribution (CSD) format, which is the fi | C++          | 📝 draft  |
| [[mri_mark_temporal_lobe]]              | takes a subject's segmentation volume and re-labels temporal lobe white matter voxels with a dedicat | C++          | 📝 draft  |
| [[mri_mask]]                            | applies a binary mask volume to an input MRI volume, setting all voxels outside the mask to a specif | C++          | 📝 draft  |
| [[mri_matrix_multiply]]                 | multiplies a sequence of 4×4 registration matrices, with optional per-matrix inversion, and writes t | C++          | 📝 draft  |
| [[mri_mc]]                              | generates a topologically consistent triangulated surface mesh from a labeled volume using the March | C++          | 📝 draft  |
| [[mri_mcadura_seg]]                     | performs deep learning-based segmentation of the meningeal compartments (dura mater and related stru | Shell (tcsh) | 📝 draft  |
| [[mri_mcsim]]                           | computes Cluster Size Distribution (CSD) tables for surface-based multiple comparison correction via | C++          | 📝 draft  |
| [[mri_mergelabels]]                     | concatenates multiple FreeSurfer `                                                                   | Shell (tcsh) | 📝 draft  |
| [[mri_mi]]                              | computes the Mutual Information (MI) between two input MRI volumes that share the same geometry and  | C++          | 📝 draft  |
| [[mri_modify]]                          | modifies header fields of an MRI volume file in-place (read/write), allowing direct editing of direc | C++          | 📝 draft  |
| [[mri_morphology]]                      | applies 3D morphological operations (dilate, erode, open, close, mode filter, erode with threshold,  | C++          | 📝 draft  |
| [[mri_mosaic]]                          | takes a set of MRI volumes (or slices) as input and creates a single large mosaic volume that contai | C++          | 📝 draft  |
| [[mri_multiscale_segment]]              | updates a conformed segmentation (white matter mask) using high-resolution image data                | C++          | 📝 draft  |
| [[mri_multispectral_segment]]           | segments tissue classes (grey matter, white matter, CSF) using both T1 and proton density (PD) volum | C++          | 📝 draft  |
| [[mri_mvglmfit]]                        | fits a multivariate General Linear Model (MVGLM) to a set of MRI data volumes and performs permutati | C++          | 📝 draft  |
| [[mri_nlfilter]]                        | applies a nonlinear spatial filter to a 3-D MRI volume                                               | C++          | 📝 draft  |
| [[mri_normalize]]                       | is FreeSurfer's surface-aware intensity normaliser                                                   | C++          | 📝 draft  |
| [[mri_normalize_tp2]]                   | performs intensity normalization of a second (or subsequent) timepoint MRI volume using control poin | C++          | 📝 draft  |
| [[mri_or]]                              | performs a voxel-wise logical OR operation across two or more binary MRI volumes                     | C++          | 📝 draft  |
| [[mri_paint]]                           | samples a volumetric MRI image onto the vertices of a surface file, producing a surface overlay (cur | C++          | 📝 draft  |
| [[mri_parse_sdcmdir]]                   | scans a directory of Siemens DICOM files, parses metadata from each file, and produces a summary tab | C++          | 📝 draft  |
| [[mri_parselabel]]                      | parses a FreeSurfer label file and performs coordinate operations: it reads 3D vertex/voxel coordina | C++          | 📝 draft  |
| [[mri_partial_ribbon]]                  | computes partial volume fractions for voxels within the cortical ribbon                              | C++          | 📝 draft  |
| [[mri_path2label]]                      | converts between FreeSurfer path files (tractography/manual path annotations on a surface) and FreeS | C++          | 📝 draft  |
| [[mri_pglands_seg]]                     | is a deep learning-based tool for segmenting the pituitary and pineal glands from T1-weighted MRI    | Python       | 📝 draft  |
| [[mri_polv]]                            | computes the plane of least variance (POLV) normal for each voxel in a 3-D MRI volume                | C++          | 📝 draft  |
| [[mri_pretess]]                         | modifies a binary segmentation volume so that all voxels with a given label are **face-connected** ( | C++          | 🔎 review |
| [[mri_probe_ima]]                       | probes the header of Siemens `                                                                       | C++          | 📝 draft  |
| [[mri_probedicom]]                      | queries DICOM file header fields and prints their values to stdout                                   | C++          | 📝 draft  |
| [[mri_reduce]]                          | reduces the spatial resolution of a 3-D MRI volume by a factor of 2 along each dimension, using loca | C++          | 📝 draft  |
| [[mri_refine_seg]]                      | post-processes a volumetric segmentation by removing spurious clusters and correcting topological er | C++          | 📝 draft  |
| [[mri_relabel_hypointensities]]         | post-processes the aseg segmentation by relabeling white-matter hypointensity voxels that lie outsid | C++          | 📝 draft  |
| [[mri_relabel_nonwm_hypos]]             | relabels voxels in a segmentation volume that are labeled as non-WM hypointensities (FreeSurfer labe | C++          | 📝 draft  |
| [[mri_remove_neck]]                     | removes non-brain tissue inferior to the brain (neck, lower skull base, cervical spine) from a T1-we | C++          | 📝 draft  |
| [[mri_ribbon]]                          | creates a cortical ribbon mask by filling the volume between two surfaces (an inner surface and an o | C++          | 📝 draft  |
| [[mri_sclimbic_seg]]                    | segments subcortical limbic structures from T1-weighted MRI using a deep-learning model implemented  | Python       | 📝 draft  |
| [[mri_seg_diff]]                        | computes and merges differences between two segmentation volumes — primarily designed to manage manu | C++          | 📝 draft  |
| [[mri_seg_overlap]]                     | computes per-label overlap metrics (Dice coefficient and/or Jaccard index) between two segmentation  | C++          | 📝 draft  |
| [[mri_segcentroids]]                    | computes the spatial centroid (centre of mass) of each label in a segmentation volume                | C++          | 📝 draft  |
| [[mri_seghead]]                         | segments the head (scalp boundary) from a T1-weighted MRI volume                                     | C++          | 📝 draft  |
| [[mri_segment]]                         | produces a binary white-matter (WM) segmentation volume from a bias-corrected, intensity-normalised  | C++          | 🔎 review |
| [[mri_segment_hypothalamic_subunits]]   | is a Python-based deep-learning tool that segments hypothalamic subunits from T1-weighted MRI        | Python       | 📝 draft  |
| [[mri_segment_thalamic_nuclei_dti_cnn]] | segments thalamic nuclei from a combination of T1-weighted MRI, fractional anisotropy (FA), and prin | Python       | 📝 draft  |
| [[mri_segment_tumor]]                   | is a legacy C++ tool for segmenting brain tumors from MRI volumes                                    | C++          | 📝 draft  |
| [[mri_segment_wm_damage]]               | is a legacy C++ tool for segmenting white matter damage or lesions (e                                | C++          | 📝 draft  |
| [[mri_segreg]]                          | computes and optimises a cost function for surface-based registration of functional (EEG/MEG/BOLD) d | C++          | 📝 draft  |
| [[mri_segstats]]                        | is a core FreeSurfer tool that computes per-label statistics from a volumetric segmentation          | C++          | 📝 draft  |
| [[mri_si_prep]]                         | prepares MRI intensity and segmentation volumes for "smart interpolation" by reducing the field of v | C++          | 📝 draft  |
| [[mri_simulate_atrophy]]                | simulates atrophic changes in cortical or subcortical structures in a T1-weighted MRI volume         | C++          | 📝 draft  |
| [[mri_stats2seg]]                       | maps per-structure statistical values (e                                                             | C++          | 📝 draft  |
| [[mri_stopmask]]                        | creates a "stop mask" volume used by `mris_place_surface` (the surface placement module of `mris_mak | C++          | 📝 draft  |
| [[mri_strip_nonwhite]]                  | removes non-white-matter voxels from an MRI volume using a morphological transform (M3D morph) to de | C++          | 📝 draft  |
| [[mri_strip_subject_info]]              | removes personally identifiable information (PII) from raw MRI scanner image files (GE or Siemens fo | C++          | 📝 draft  |
| [[mri_super_synth]]                     | is a deep learning-based tool for super-resolution synthesis of brain MRI                            | Python       | 📝 draft  |
| [[mri_surf2surf]]                       | resamples surface-encoded data from one subject's surface onto another subject's surface (or onto th | C++          | 📝 draft  |
| [[mri_surf2vol]]                        | is the inverse of [[mri_vol2surf]]: it projects per-vertex surface overlay values back into a volume | C++          | 🔎 review |
| [[mri_surf2volseg]]                     | back-projects cortical surface parcellation annotations onto a volumetric segmentation, producing th | C++          | 📝 draft  |
| [[mri_surfacemask]]                     | takes an MRI volume and a cortical surface and produces a masked output volume where all voxels outs | C++          | 📝 draft  |
| [[mri_surfcluster]]                     | performs cluster-growing and cluster-wise inference on surface-encoded statistical maps              | C++          | 📝 draft  |
| [[mri_synthesize]]                      | synthesizes an MRI volume of arbitrary contrast from quantitative tissue parameter maps (T1, PD, T2* | C++          | 📝 draft  |
| [[mri_synthseg]]                        | is a deep-learning segmentation tool that parcellates brain MRI into anatomical structures without r | Python       | 📝 draft  |
| [[mri_synthsr]]                         | converts a brain MRI of any contrast and resolution into a synthetic 1mm isotropic MP-RAGE (T1-weigh | Python       | 📝 draft  |
| [[mri_synthsr_hyperfine]]               | is a thin wrapper around [[mri_synthsr]] that automatically selects the low-field MRI model (`--lowf | Python       | 📝 draft  |
| [[mri_synthstrip]]                      | is FreeSurfer's learning-based skull stripper: a deep 3-D U-Net trained on synthetic data that predi | Python       | 📝 draft  |
| [[mri_tessellate]]                      | creates a triangulated surface mesh from a binary volume by extracting the boundary of all voxels wi | C++          | 🔎 review |
| [[mri_threshold]]                       | applies intensity thresholding to an MRI volume                                                      | C++          | 📝 draft  |
| [[mri_topologycorrection]]              | corrects topological defects in volumetric binary segmentations                                      | C++          | 📝 draft  |
| [[mri_tumorsynth]]                      | synthesizes MRI volumes containing simulated brain tumors                                            | Python       | 📝 draft  |
| [[mri_twoclass]]                        | performs a voxel-level two-class morphometric comparison between two groups of subjects              | C++          | 📝 draft  |
| [[mri_update_gca]]                      | updates a Gaussian Classifier Atlas (GCA) model with new training data, allowing incremental refinem | C++          | 📝 draft  |
| [[mri_validate_skull_stripped]]         | compares a skull-stripped test volume against a reference volume and computes two error metrics — th | C++          | 📝 draft  |
| [[mri_vessel_segment]]                  | segments blood vessels from T1- and T2-weighted MRI volumes using a multimodal approach              | C++          | 📝 draft  |
| [[mri_vol2label]]                       | (installed as a renamed copy of `mri_cor2label`) converts voxel values in a volume or surface overla | C++          | 📝 draft  |
| [[mri_vol2roi]]                         | samples a volume to compute statistics within one or more regions of interest (ROIs)                 | C++          | 📝 draft  |
| [[mri_vol2surf]]                        | resamples a volumetric data set onto the vertices of a FreeSurfer surface, producing a per-vertex ov | C++          | 🔎 review |
| [[mri_vol2vol]]                         | resamples a volume into another field-of-view (FOV) by applying a registration or warp transform     | C++          | 📝 draft  |
| [[mri_volcluster]]                      | identifies spatially contiguous clusters in a volumetric statistical map that exceed a threshold, an | C++          | 📝 draft  |
| [[mri_voldiff]]                         | compares two MRI volumes for equality, reporting differences in dimensions, precision, voxel resolut | C++          | 📝 draft  |
| [[mri_volsynth]]                        | synthesises test volumes with user-specified statistical distributions                               | C++          | 📝 draft  |
| [[mri_vsinus_seg]]                      | is a deep-learning-based venous sinus segmentation tool implemented as a tcsh wrapper script         | tcsh         | 📝 draft  |
| [[mri_watershed]]                       | is FreeSurfer's classical skull-stripping tool                                                       | C++          | 📝 draft  |
| [[mri_wbc]]                             | computes whole-brain connectivity (WBC) maps from volumetric and/or surface functional MRI data      | C++          | 📝 draft  |
| [[mri_wmfilter]]                        | applies intensity-based filtering to white matter voxels in a brain volume, likely to clean up or re | C++          | 📝 draft  |
| [[mri_xcorr]]                           | computes voxel-wise cross-correlation between two input volumes and optionally applies a mask        | C++          | 📝 draft  |
| [[mri_xvolavg]]                         | (cross-volume average) averages multiple MRI volumes — which can be 4D — into a single output volume | C++          | 📝 draft  |
| [[mri_z2p]]                             | converts a z-score (standard normal deviate) map to a $-\log_{10}(p)$ significance map (signed or un | C++          | 📝 draft  |

## Surface Tools (`mris_*`)

| Tool | Summary | Language | Status |
|------|---------|----------|--------|
| [[mris_AA_shrinkwrap]] | fits a spherical or icosahedral surface mesh onto the inner skull boundary by iteratively deforming  | C++ | 📝 draft |
| [[mris_BA_segment]] | segments a Brodmann area (specifically area MT/V5 in the documented use case) from cortical MRI data | C++ | 📝 draft |
| [[mris_add_template]] | adds a single subject's spherically-registered surface data to a surface parameter template (` | C++ | 📝 draft |
| [[mris_anatomical_stats]] | computes per-parcel surface morphometric statistics for each region in a cortical parcellation annot | C++ | 🔎 review |
| [[mris_annot_diff]] | compares two FreeSurfer annotation (` | C++ | 📝 draft |
| [[mris_annot_to_segmentation]] | converts a cortical surface annotation (` | C++ | 📝 draft |
| [[mris_apply_reg]] | applies one or more surface registrations to resample scalar overlays, labels, annotations, or surfa | C++ | 📝 draft |
| [[mris_aseg_distance]] | computes, for each vertex on a cortical surface, the Euclidean or other distance to the centroid of  | C++ | 📝 draft |
| [[mris_autodet_gwstats]] | automatically detects the grey matter and white matter intensity statistics — specifically the mean  | C++ | 📝 draft |
| [[mris_average_curvature]] | computes a group average of a scalar curvature field (any ` | C++ | 📝 draft |
| [[mris_average_parcellation]] | computes a frequency-weighted group average of cortical parcellation labels across a set of subjects | C++ | 📝 draft |
| [[mris_calc]] | is a command-line arithmetic calculator for per-vertex surface overlay files ([[curv-format]]) and v | C++ | 🔎 review |
| [[mris_classify_thickness]] | trains and applies a random forest classifier to cortical thickness patterns mapped to a common coor | C++ | 📝 draft |
| [[mris_compute_acorr]] | computes the spatial autocorrelation function of a curvature (scalar) field on the cortical surface  | C++ | 📝 draft |
| [[mris_compute_layer_intensities]] | computes the mean MRI intensity within each of the cortical layers (1–6) for each voxel in a volume, | C++ | 📝 draft |
| [[mris_compute_lgi]] | computes the local gyrification index (lGI) at each vertex of a cortical surface | Shell (tcsh) + MATLAB | 📝 draft |
| [[mris_compute_optimal_kernel]] | computes the isotropic Gaussian smoothing kernel that best aligns an individual cortical label with  | C++ | 📝 draft |
| [[mris_compute_overlap]] | computes the surface area of each label in an annotation file, along with the total cortical surface | C++ | 📝 draft |
| [[mris_compute_parc_overlap]] | compares two cortical parcellation annotations for a subject and computes: (1) an overall Dice coeff | C++ | 📝 draft |
| [[mris_compute_volume_fractions]] | computes, for each voxel in a reference volume, the fraction of that voxel's volume that lies within | C++ | 📝 draft |
| [[mris_congeal]] | performs simultaneous group-wise surface registration (congealing) — registering all subjects simult | C++ | 📝 draft |
| [[mris_convert]] | converts cortical surface files, scalar overlays, annotations, and labels between FreeSurfer binary  | C++ | 📝 draft |
| [[mris_copy_header]] | copies the geometry header from one FreeSurfer surface file to another, writing the result as a new  | C++ | 📝 draft |
| [[mris_curvature]] | computes the second fundamental form of a cortical surface mesh, producing per-vertex estimates of m | C++ | 📝 draft |
| [[mris_curvature2image]] | maps a curvature (or other scalar overlay) defined on a FreeSurfer surface mesh onto a volumetric im | C++ | 📝 draft |
| [[mris_curvature_stats]] | computes descriptive statistics on curvature values across a cortical surface, optionally restricted | C++ | 📝 draft |
| [[mris_defects_pointset]] | converts a surface topology defect label (produced by `mris_fix_topology`) into a pointset file, whe | C++ | 📝 draft |
| [[mris_deform]] | deforms a cortical surface to lie at the gray/white or pial boundary using a **piecewise-constant ge | C++ | 📝 draft |
| [[mris_density]] | computes a density map of interior voxels for each vertex on a surface | C++ | 📝 draft |
| [[mris_diff]] | compares two surfaces or surface-associated files (curvature files, annotation files) and reports wh | C++ | 📝 draft |
| [[mris_distance_map]] | computes the geodesic distance from every vertex on a surface to a single reference vertex and write | C++ | 📝 draft |
| [[mris_distance_to_label]] | computes distance maps from the cortical surface to subcortical anatomical structures (amygdala, hip | C++ | 📝 draft |
| [[mris_distance_transform]] | computes the geodesic distance transform on a surface mesh from a given label (set of vertices) | C++ | 📝 draft |
| [[mris_divide_parcellation]] | splits one or more parcels in a cortical parcellation (annotation file) into sub-divisions perpendic | C++ | 📝 draft |
| [[mris_entropy]] | computes the entropy of a surface overlay (w-file) on a FreeSurfer surface | C++ | 📝 draft |
| [[mris_errors]] | measures surface errors, specifically area and angle distortions relative to the original smooth sur | C++ | 📝 draft |
| [[mris_estimate_wm]] | estimates the white matter boundary on a cortical surface | unknown | 📝 draft |
| [[mris_euler_number]] | computes the Euler number of a FreeSurfer surface mesh, which is the primary topological quality met | C++ | 📝 draft |
| [[mris_expand]] | expands a surface outward by a specified distance (in mm) while maintaining smoothness and preventin | C++ | 📝 draft |
| [[mris_extract_main_component]] | extracts the largest connected component from a FreeSurfer surface mesh, discarding all smaller disc | C++ | 📝 draft |
| [[mris_extract_patches]] | extracts volumetric cubic patches from around labelled surface vertices, plus their corresponding lo | C++ | 📝 draft |
| [[mris_extract_values]] | extracts scalar overlay values from a surface and writes them to a CSV file, optionally restricted b | C++ | 📝 draft |
| [[mris_exvivo_surfaces]] | places white matter and pial surfaces on ex vivo (post-mortem) multi-echo FLASH (MEF) MRI data | C++ | 📝 draft |
| [[mris_fbirn_annot]] | creates a cortical surface annotation file using the FBIRN (Function Biomedical Informatics Research | C++ | 📝 draft |
| [[mris_fill]] | fills the interior of a closed FreeSurfer surface mesh with a binary label in a volumetric image, pr | C++ | 📝 draft |
| [[mris_find_flat_regions]] | identifies vertices on a cortical surface whose surface normals are nearly perpendicular to the prin | C++ | 📝 draft |
| [[mris_fix_topology]] | is a critical `recon-all` AutoRecon2 tool that corrects topological defects (handles and holes) in t | C++ | 📝 draft |
| [[mris_flatten]] | takes a cortical surface patch (a subset of the full triangulated surface mesh) and flattens it into | C++ | 📝 draft |
| [[mris_fwhm]] | has two related functions: (1) apply surface-based spatial smoothing to a surface overlay dataset, a | C++ | 📝 draft |
| [[mris_glm]] | performs vertex-wise General Linear Model (GLM) inference on cortical surface data | C++ | 📝 draft |
| [[mris_gradient]] | computes the spatial gradient of a surface-based scalar field (overlay) on a triangulated cortical m | C++ | 📝 draft |
| [[mris_hausdorff_dist]] | computes the Hausdorff distance between two surface regions (labels) on a cortical mesh | C++ | 📝 draft |
| [[mris_image2vtk]] | is a format conversion tool that converts a FreeSurfer MRI volume (image) to a VTK polydata mesh for | C++ | 📝 draft |
| [[mris_inflate]] | expands a folded cortical surface mesh into a smooth, inflated representation by modelling the mesh  | C++ | 🔎 review |
| [[mris_info]] | prints metadata and statistics about a FreeSurfer surface file | C++ | 📝 draft |
| [[mris_init_global_tractography]] | initializes a global cortical tractography model by fitting Catmull-Rom splines to connect pairs of  | C++ | 📝 draft |
| [[mris_intensity_profile]] | computes the intensity profile of an MRI volume through the cortical ribbon along the surface normal | C++ | 📝 draft |
| [[mris_interpolate_warp]] | takes two surface meshes (representing the same surface at different states — e | C++ | 📝 draft |
| [[mris_jacobian]] | computes the Jacobian of a surface mapping — the ratio of face areas between a mapped (deformed) sur | C++ | 📝 draft |
| [[mris_label2annot]] | converts a set of individual surface label files into a single FreeSurfer annotation (` | C++ | 📝 draft |
| [[mris_label_area]] | computes the surface area of cortical regions defined by an annotation (` | C++ | 📝 draft |
| [[mris_label_calc]] | performs Boolean set operations and morphological operations on FreeSurfer surface label files | C++ | 📝 draft |
| [[mris_label_mode]] | computes the mode (most common) label assignment at each location in a spherical parameterization of | C++ | 📝 draft |
| [[mris_left_right_register]] | registers a cortical surface from one hemisphere to the other, enabling cross-hemispheric comparison | C++ | 📝 draft |
| [[mris_longitudinal_surfaces]] | places white matter and pial cortical surfaces for the FreeSurfer longitudinal processing stream | C++ | 📝 draft |
| [[mris_make_average_surface]] | creates a group-average surface by averaging the Talairach-registered vertex coordinates from multip | C++ | 📝 draft |
| [[mris_make_face_parcellation]] | creates a cortical surface parcellation where each parcel corresponds to a face (triangle) in a refe | C++ | 📝 draft |
| [[mris_make_map_surfaces]] | performs **surface deformation that maximises the likelihood of the underlying MRI data** for genera | C++ | 📝 draft |
| [[mris_make_surfaces]] | is the primary cortical surface placement tool in the FreeSurfer pipeline | C++ | 📝 draft |
| [[mris_make_template]] | constructs a group-average spherical surface template (atlas) from the registered spherical surfaces | C++ | 📝 draft |
| [[mris_map_cuts]] | maps cutting planes (patch boundaries) from one surface representation to another | C++ | 📝 draft |
| [[mris_mef_surfaces]] | places white matter and pial cortical surfaces using **multi-echo FLASH (MEF)** MRI data | C++ | 📝 draft |
| [[mris_merge_parcellations]] | merges two cortical parcellation annotation files (` | C++ | 📝 draft |
| [[mris_mesh_subdivide]] | increases the resolution of a triangulated cortical surface mesh by applying a mesh subdivision algo | C++ | 📝 draft |
| [[mris_morph_stats]] | computes statistics characterizing a surface-based morphological deformation field | C++ | 📝 draft |
| [[mris_ms_refine]] | refines the placement of cortical surfaces (white and pial boundaries) using multi-spectral (multi-e | C++ | 📝 draft |
| [[mris_ms_surface_CNR]] | computes the contrast-to-noise ratio (CNR) along a cortical surface (specifically the white surface  | C++ | 📝 draft |
| [[mris_multimodal]] | refines cortical surface placement using multiple MRI modalities (T1, T2, FLAIR) simultaneously | C++ | 📝 draft |
| [[mris_multimodal_surface_placement]] | places cortical surfaces using one or more MRI modalities (T1, T2, FLAIR) as inputs, using the `MRIS | C++ | 📝 draft |
| [[mris_multiscale_stats]] | performs multi-scale vertex-wise statistical analysis on surface curvature data | C++ | 📝 draft |
| [[mris_niters2fwhm]] | converts the number of surface smoothing iterations (as used by [[mris_smooth]]) to an equivalent Ga | C++ | 📝 draft |
| [[mris_nudge]] | manually nudges a region of surface vertices toward a target intensity value | C++ | 📝 draft |
| [[mris_parcellate_connectivity]] | is intended to parcellate a cortical surface into regions based on a connectivity matrix | C++ | 📝 draft |
| [[mris_place_surface]] | positions the triangular mesh representing a cortical surface — either the white matter / gray matte | C++ | 📝 draft |
| [[mris_pmake]] | computes shortest paths and related cost maps on FreeSurfer brain surfaces using Dijkstra's algorith | C++ | 📝 draft |
| [[mris_preproc]] | is the standard FreeSurfer tool for preparing surface-based data for group-level analysis | shell | 🔎 review |
| [[mris_profileClustering]] | clusters surface vertices based on their cortical intensity profiles — the sequence of MRI values sa | C++ | 📝 draft |
| [[mris_refine_surfaces]] | refines the white and pial cortical surfaces (`?h | C++ | 📝 draft |
| [[mris_register]] | registers a subject's spherical surface (`?h | C++ | 🔎 review |
| [[mris_register_josa]] | registers a cortical hemisphere's spherical surface to an atlas using a deep learning model (SphereM | Python | 📝 draft |
| [[mris_register_label_map]] | registers an individual subject's resting-state functional connectivity label map to a group-average | C++ | 📝 draft |
| [[mris_register_to_label]] | computes a rigid alignment between a cortical surface and a volumetric label (binary mask) by maximi | C++ | 📝 draft |
| [[mris_register_to_volume]] | computes a rigid alignment between a cortical surface and an intensity volume by maximising the grad | C++ | 📝 draft |
| [[mris_remesh]] | changes the vertex density and mesh quality of a cortical surface without altering its overall shape | C++ | 📝 draft |
| [[mris_remove_intersection]] | removes self-intersecting triangles from a cortical surface mesh and writes a topologically correcte | C++ | 📝 draft |
| [[mris_remove_negative_vertices]] | removes "negative vertices" from a spherical surface — vertices that create faces with negative (clo | C++ | 📝 draft |
| [[mris_remove_variance]] | removes from a surface curvature/overlay file the component of variance that is linearly predictable | C++ | 📝 draft |
| [[mris_reposition_surface]] | moves surface vertices near user-specified control points (a pointset file) toward local intensity g | C++ | 📝 draft |
| [[mris_resample]] | resamples an atlas surface (or any source surface) onto a subject's surface using their respective s | C++ | 📝 draft |
| [[mris_rescale]] | rescales a cortical surface (typically a sphere) so that its average radius equals the canonical Fre | C++ | 📝 draft |
| [[mris_reverse]] | reverses (reflects) a cortical surface along one of the three coordinate axes (X, Y, or Z) | C++ | 📝 draft |
| [[mris_rotate]] | applies a 3D rotation to a cortical surface by rotating all vertex positions through specified Euler | C++ | 📝 draft |
| [[mris_sample_label]] | samples a label file onto a surface, associating label membership with surface vertices | C++ | 📝 draft |
| [[mris_sample_parc]] | samples a volumetric parcellation (e | C++ | 📝 draft |
| [[mris_seg2annot]] | converts a surface-based segmentation file (a per-vertex integer index map) into a FreeSurfer annota | C++ | 📝 draft |
| [[mris_segment]] | segments cortical areas on a surface based on connectivity, correlation, or intensity profiles deriv | C++ | 📝 draft |
| [[mris_segment_vals]] | identifies connected clusters of vertices on a surface that exceed a threshold value, then labels ea | C++ | 📝 draft |
| [[mris_segmentation_stats]] | evaluates surface segmentation accuracy by computing ROC (Receiver Operating Characteristic) curves  | C++ | 📝 draft |
| [[mris_shrinkwrap]] | fits BEM (Boundary Element Method) surfaces (inner skull, outer skull, skin) onto a labeled segmenta | C++ | 📝 draft |
| [[mris_simulate_atrophy]] | simulates cortical atrophy in a T1-weighted MRI volume by darkening intensities in the cortex propor | C++ | 📝 draft |
| [[mris_skeletonize]] | skeletonizes a surface scalar map (such as curvature) to produce label files representing the one-di | C++ | 📝 draft |
| [[mris_smooth]] | applies iterative surface smoothing to a triangulated mesh by averaging vertex positions with their  | C++ | 🔎 review |
| [[mris_smooth_intracortical]] | smooths laminar (intracortical) fMRI data by simultaneously applying tangential smoothing (across co | C++ | 📝 draft |
| [[mris_sphere]] | maps a cortical surface (see [[surface-representations]]) to a sphere by minimising metric distortio | C++ | 🔎 review |
| [[mris_spherical_average]] | computes group-average surface data (coordinates, curvature values, vertex areas, or labels) across  | C++ | 📝 draft |
| [[mris_spintest]] | performs a spin test for assessing the statistical significance of spatial correlations between two  | C++ | 📝 draft |
| [[mris_surf2vtk]] | converts a FreeSurfer binary surface file to VTK PolyData format (` | C++ | 📝 draft |
| [[mris_surface_change]] | computes the longitudinal displacement between two surfaces in the surface-normal direction, produci | C++ | 📝 draft |
| [[mris_surface_stats]] | computes group-level statistics (mean, standard deviation, absolute mean, absolute std, and z-scores | C++ | 📝 draft |
| [[mris_surface_to_vol_distances]] | computes histograms of distances between individual subject surfaces and an average surface (or temp | C++ | 📝 draft |
| [[mris_svm_classify]] | applies a pre-trained Support Vector Machine (SVM) model to surface morphometry data (curvature, ann | C++ | 📝 draft |
| [[mris_svm_train]] | trains a Support Vector Machine (SVM) classifier on surface morphometry data from a set of training  | C++ | 📝 draft |
| [[mris_talairach]] | applies the Talairach transform stored in a surface file's header to all vertex coordinates of that  | C++ | 📝 draft |
| [[mris_target_pos]] | computes the desired target location of a surface vertex (primarily for exploring and debugging targ | C++ | 📝 draft |
| [[mris_thickness]] | computes the cortical thickness at each vertex of a FreeSurfer surface by measuring the distance bet | C++ | 📝 draft |
| [[mris_thickness_comparison]] | computes summary statistics comparing a cortical thickness map to the white matter folding pattern ( | C++ | 📝 draft |
| [[mris_thickness_diff]] | computes the vertex-wise difference between two surface scalar maps (typically thickness maps) on tw | C++ | 📝 draft |
| [[mris_topo_fixer]] | corrects topological defects in a cortical surface tessellation, ensuring the result is a closed gen | C++ | 📝 draft |
| [[mris_transform]] | applies a spatial transform (linear LTA or nonlinear 3D morph/GCAM) to the vertex positions of a cor | C++ | 📝 draft |
| [[mris_translate_annotation]] | remaps the label values in a cortical surface annotation file according to a user-supplied translati | C++ | 📝 draft |
| [[mris_transmantle_dysplasia_paths]] | estimates the probability that transmantle cortical pathways (radial paths from the cortical surface | C++ | 📝 draft |
| [[mris_twoclass]] | performs a two-class statistical comparison of surface morphometric measures (e | C++ | 📝 draft |
| [[mris_volmask]] | creates a voxel-based mask (the cortical "ribbon") from the four FreeSurfer cortical surfaces (lh | C++ | 📝 draft |
| [[mris_volmask_novtk]] | is a build variant of [[mris_volmask]] that does not depend on the VTK library | C++ | 📝 draft |
| [[mris_volmask_vtk]] | is the VTK-enabled build variant of [[mris_volmask]] | C++ | 📝 draft |
| [[mris_volsmooth]] | smooths a functional or statistical volume along the cortical surface geometry | shell | 📝 draft |
| [[mris_volume]] | computes the volume enclosed by a closed, genus-zero triangulated surface using the divergence theor | C++ | 📝 draft |
| [[mris_w_to_curv]] | converts a FreeSurfer ` | C++ | 📝 draft |
| [[mris_warp]] | applies a displacement (deformation) field to warp a surface | C++ | 📝 draft |
| [[mris_watershed]] | performs watershed-based parcellation of a cortical surface by growing basins from local minima (or  | C++ | 📝 draft |
| [[mris_wm_volume]] | computes the volume of white matter interior to the `?h | C++ | 📝 draft |
| [[mrisp_paint]] | resamples an MRISP spherical parameterization (.tif) back onto surface vertices (inverse of mrisp_write) | C++ | 📝 draft |
| [[mrisp_write]] | maps per-vertex scalar overlays from a surface onto an MRISP spherical parameterization grid (.tif) | C++ | 📝 draft |

## Diffusion MRI Tools (`dmri_*`)

| Tool | Summary | Language | Status |
|------|---------|----------|--------|
| [[dmri_AnatomiCuts]] | performs anatomically-informed spectral clustering of white-matter streamlines | C++ | 📝 draft |
| [[dmri_ac.sh]] | is a bash pipeline orchestrator for the AnatomiCuts diffusion MRI tractography clustering workflow | shell | 📝 draft |
| [[dmri_bset]] | extracts a subset of volumes, b-values, and gradient directions from a diffusion MRI dataset | tcsh | 📝 draft |
| [[dmri_coloredFA]] | assigns colors to streamlines in ` | C++ | 📝 draft |
| [[dmri_extractSurfaceMeasurements]] | extracts per-cluster measurements from both diffusion MRI maps (FA, MD, RD, AD, and DKI metrics) and | C++ | 📝 draft |
| [[dmri_forrest]] | is a random-forest classifier for white-matter tract segmentation | C++ | 📝 draft |
| [[dmri_group]] | combines per-subject tractography path statistics (from `dmri_pathstats`) across multiple subjects t | C++ | 📝 draft |
| [[dmri_groupByEndpoints]] | groups streamlines from a tractography ` | C++ | 📝 draft |
| [[dmri_match]] | establishes correspondence between AnatomiCuts fiber bundle clusters from two subjects by solving an | C++ | 📝 draft |
| [[dmri_mergepaths]] | combines posterior probability distribution volumes from multiple white-matter tracts (output by `dm | C++ | 📝 draft |
| [[dmri_motion]] | computes measures of head motion in diffusion MRI data | C++ | 📝 draft |
| [[dmri_neighboringRegions]] | is a stub tool within the AnatomiCuts diffusion MRI pipeline | C++ | 📝 draft |
| [[dmri_paths]] | performs probabilistic global tractography using a Bayesian MCMC (Markov Chain Monte Carlo) framewor | C++ | 📝 draft |
| [[dmri_pathstats]] | computes diffusion MRI measures (FA, MD, radial diffusivity, axial diffusivity, or user-provided sca | C++ | 📝 draft |
| [[dmri_projectEndPoints]] | marks the endpoints of streamlines in a tractography file with a distinct value (hardcoded to 1) and | C++ | 📝 draft |
| [[dmri_saveHistograms]] | computes and saves anatomical label histograms for fiber bundle clusters from a tractography file, u | C++ | 📝 draft |
| [[dmri_spline]] | interpolates a smooth spline curve from a set of control points, producing a dense path representati | C++ | 📝 draft |
| [[dmri_stats_ac]] | extracts mean diffusion MRI measures (FA, MD, RD, AD, and optional DKI metrics) for each AnatomiCuts | C++ | 📝 draft |
| [[dmri_tensoreig]] | computes the eigensystem (eigenvalues and eigenvectors) of diffusion tensors and derives fractional  | C++ | 📝 draft |
| [[dmri_train]] | trains the anatomical priors used by the TRACULA probabilistic tractography system (`dmri_paths`) | C++ | 📝 draft |
| [[dmri_trk2trk]] | is a Swiss-army-knife tool for transforming and filtering streamlines stored in TrackVis ` | C++ | 📝 draft |
| [[dmri_violinPlots]] | generates violin plots comparing diffusion MRI measures across groups of subjects, organized by fibe | Python | 📝 draft |
| [[dmri_vox2vox]] | applies affine and/or non-linear warp transforms to voxel coordinates stored in plain-text files | C++ | 📝 draft |
| [[dt_recon]] | is a tcsh pipeline script that performs diffusion tensor reconstruction from a raw DWI volume | shell | 📝 draft |

## Atlas / Classifier Tools (`mri_ca_*`, `mris_ca_*`, RF, GCA)

| Tool | Summary | Language | Status |
|------|---------|----------|--------|
| [[mri_build_priors]] | is a tool in the `attic/` directory that builds spatial prior probability maps for tissue classifica | C++ | 📝 draft |
| [[mri_ca_label]] | performs **subcortical and whole-brain volumetric labeling** using a Gaussian Classifier Atlas (GCA) | C++ | 🔎 review |
| [[mri_ca_normalize]] | normalizes one or more MRI volumes by using a Gaussian Classifier Atlas (GCA) to identify reliable w | C++ | 📝 draft |
| [[mri_ca_register]] | performs high-dimensional nonlinear registration of a subject's normalized MRI volume to a Gaussian  | C++ | 📝 draft |
| [[mri_ca_tissue_parms]] | computes average biophysical tissue parameters (T1 relaxation time, proton density PD) for each labe | C++ | 📝 draft |
| [[mri_ca_train]] | builds a Gaussian Classifier Atlas (GCA) from a training set of subjects for which both a normalized | C++ | 📝 draft |
| [[mri_cal_renormalize_gca]] | renormalizes a Gaussian Classifier Atlas (GCA) for a set of longitudinal time-point volumes | C++ | 📝 draft |
| [[mri_em_register]] | computes a 12-parameter (9-DOF anisotropic affine by default, or 6-DOF rigid with `-rigid`, or 3-DOF | C++ | 📝 draft |
| [[mri_gca_ambiguous]] | identifies voxels where a Gaussian Classifier Atlas (GCA) model is ambiguous — i | C++ | 📝 draft |
| [[mri_gcab_train]] | trains a GCA Boundary (GCAB) atlas from a set of training subjects | C++ | 📝 draft |
| [[mri_log_likelihood]] | computes the log-likelihood of one or more MRI volumes under a Gaussian Classifier Atlas (GCA) model | C++ | 📝 draft |
| [[mri_ms_EM]] | performs multi-spectral tissue segmentation using a Gaussian Mixture Model (GMM) Expectation-Maximiz | C++ | 📝 draft |
| [[mri_ms_EM_with_atlas]] | extends [[mri_ms_EM]] by incorporating a Gaussian Classifier Atlas (GCA) as spatial prior informatio | C++ | 📝 draft |
| [[mri_ms_LDA]] | performs Linear Discriminant Analysis (LDA) on multi-spectral MRI data to compute a linear projectio | C++ | 📝 draft |
| [[mri_ms_fitparms]] | fits quantitative tissue parameters — T1 relaxation time and proton density (PD) — from a set of FLA | C++ | 📝 draft |
| [[mri_rf_label]] | applies a trained Random Forest Array (RFA) classifier to label voxels in an MRI volume | C++ | 📝 draft |
| [[mri_rf_long_label]] | is the longitudinal counterpart to [[mri_rf_label]] | C++ | 📝 draft |
| [[mri_rf_long_train]] | trains a longitudinal Random Forest Array (RFA) classifier using data from multiple subjects, each w | C++ | 📝 draft |
| [[mri_rf_train]] | trains a Random Forest Array (RFA) atlas classifier from a set of labeled training subjects | C++ | 📝 draft |
| [[mri_train]] | trains a voxel-based classifier (by default a Random Forest, with Radial Basis Function as an altern | C++ | 📝 draft |
| [[mri_train_autoencoder]] | trains an autoencoder neural network on MRI volumes | C++ | 📝 draft |
| [[mris_ca_deform]] | deforms a surface of a volumetric segmentation to more smoothly and accurately represent a label bou | C++ | 📝 draft |
| [[mris_ca_label]] | performs **cortical parcellation** by labeling each surface vertex with a gyral/sulcal anatomical re | C++ | 🔎 review |
| [[mris_ca_train]] | builds a Gaussian Classifier Surface Atlas (GCSA, stored as ` | C++ | 📝 draft |
| [[mris_rf_label]] | applies a previously trained random forest (RF) classifier to label vertices on a cortical surface | C++ | 📝 draft |
| [[mris_rf_train]] | trains a random forest (RF) classifier on a set of labelled cortical surface subjects | C++ | 📝 draft |

## Registration Tools

| Tool | Summary | Language | Status |
|------|---------|----------|--------|
| [[bbregister]] | performs boundary-based registration (BBR) between a functional or diffusion MRI volume and a FreeSu | tcsh | 📝 draft |
| [[mri_add_xform_to_header]] | embeds a transform filename into a volume's header | C++ | 📝 draft |
| [[mri_concatenate_gcam]] | concatenates two or more transform files (` | C++ | 📝 draft |
| [[mri_concatenate_lta]] | concatenates two linear transform files (` | C++ | 📝 draft |
| [[mri_coreg]] | computes a rigid-body (6 DOF) or affine (up to 12 DOF) registration between two MRI volumes using No | C++ | 📝 draft |
| [[mri_cvs_check]] | is a preflight validation script for the CVS (Combined Volumetric and Surface) registration pipeline | shell (tcsh) | 📝 draft |
| [[mri_cvs_data_copy]] | creates a minimal tar archive of a FreeSurfer subject's files required for CVS registration | shell (tcsh) | 📝 draft |
| [[mri_cvs_register]] | implements the Combined Volumetric and Surface (CVS) registration method, which jointly aligns a sub | shell (tcsh) | 📝 draft |
| [[mri_dct_align]] | computes a nonlinear alignment between two volumes using a Discrete Cosine Transform (DCT) basis rep | C++ | 📝 draft |
| [[mri_dct_align_binary]] | performs DCT-based nonlinear alignment specifically optimized for binary label volumes (e | C++ | 📝 draft |
| [[mri_easyatlas]] | constructs a population-averaged MRI atlas from a directory of input scans using the EasyReg deep-le | Python | 📝 draft |
| [[mri_easyreg]] | performs deep-learning-based deformable image registration between a reference and a floating MRI vo | Python | 📝 draft |
| [[mri_easywarp]] | applies a pre-computed dense deformation field to an input MRI volume, producing a resampled (warped | Python | 📝 draft |
| [[mri_fslmat_to_lta]] | converts an FSL FLIRT affine transformation matrix (` | C++ | 📝 draft |
| [[lta_convert]] | converts linear transform files between .lta, .xfm, .mat (FSL), .dat (register.dat), .txt (ITK), and NiftyReg formats | C++ | 📝 draft |
| [[mri_hires_register]] | computes a linear transform aligning a high-resolution (hires) volume to a low-resolution (lowres) r | C++ | 📝 draft |
| [[mri_linear_align]] | computes the optimal linear (affine) alignment between two MRI volumes | C++ | 📝 draft |
| [[mri_linear_align_binary]] | is a variant of [[mri_linear_align]] that operates on binarised label volumes (rather than raw inten | C++ | 📝 draft |
| [[mri_linear_register]] | performs linear (affine or rigid) registration between two MRI volumes | C++ | 📝 draft |
| [[mri_nl_align]] | computes a non-linear (dense) volumetric alignment between two MRI volumes | C++ | 📝 draft |
| [[mri_nl_align_binary]] | performs nonlinear alignment of binary (label) volumes using a morphological deformation field (GCA  | C++ | 📝 draft |
| [[mri_register]] | performs high-dimensional nonlinear alignment of an MRI volume to a canonical atlas using a GCA (Gau | C++ | 📝 draft |
| [[mri_rigid_register]] | performs 6-DOF rigid-body registration between two MRI volumes, producing a linear transform (LTA) f | C++ | 📝 draft |
| [[mri_robust_register]] | performs linear registration (rigid, affine, or translation-only) of two MRI volumes using robust st | C++ | 📝 draft |
| [[mri_robust_template]] | constructs an unbiased, robust group template from multiple volumetric MRI images using an iterative | C++ | 📝 draft |
| [[mri_sbbr]] | performs slice-to-volume registration using an in-plane boundary-based registration (BBR) cost funct | C++ | 📝 draft |
| [[mri_synthmorph]] | is a deep-learning-based registration tool for 3D brain MRI that operates without preprocessing (no  | Python | 📝 draft |
| [[mri_transform]] | applies a linear geometric transform (LTA or legacy matrix format) to an MRI volume or connectivity  | C++ | 📝 draft |
| [[mri_transform_to_COR]] | converts a spatial transform to COR (coronal) format — the legacy FreeSurfer binary volume format th | C++ | 📝 draft |
| [[mri_warp_convert]] | converts non-linear deformation field (warp) files between formats used by different neuroimaging so | C++ | 📝 draft |

## SAMSEG / Bayesian Segmentation Tools

| Tool | Summary | Language | Status |
|------|---------|----------|--------|
| [[samseg]] | performs contrast-agnostic probabilistic whole-brain segmentation using a deformable tetrahedral mesh atlas (GEMS) with simultaneous GMM parameter estimation and bias field correction; supports multimodal inputs (T1w, T2w, FLAIR) and recon-all integration | tcsh + Python | 📝 draft |

## Pipeline Scripts and Wrappers

| Tool | Summary | Language | Status |
|------|---------|----------|--------|
| [[aparcstats2table]] | aggregates per-subject ?h.aparc.stats files into a subjects × parcels table for group analysis | Python | 📝 draft |
| [[asegstats2table]] | aggregates per-subject aseg.stats files into a subjects × structures table for group analysis | Python | 📝 draft |
| [[dt_recon]] | is a tcsh pipeline script that performs diffusion tensor reconstruction from a raw DWI volume | shell | 📝 draft |
| [[mri_add_new_tp]] | adds a new cross-sectionally processed time point to an existing longitudinal base (template) subjec | shell | 📝 draft |
| [[mri_align_long.csh]] | aligns all longitudinally processed time-point volumes (specifically `norm | shell | 📝 draft |
| [[mri_motion_correct]] | performs motion correction for anatomical MRI acquisitions consisting of multiple runs | Shell (bash) | 📝 draft |
| [[mri_motion_correct.fsl]] | performs motion correction for multi-run anatomical MRI acquisitions using FSL's `flirt` rigid-body  | Shell (tcsh) | 📝 draft |
| [[mri_motion_correct2]] | performs motion correction for multi-run anatomical MRI acquisitions using the MINC toolkit (`minctr | Shell (tcsh) | 📝 draft |
| [[mksubjdirs]] | creates an empty FreeSurfer subject directory tree with all required subdirectories and permissions | tcsh | 📝 draft |
| [[mri_nu_correct.mni]] | is a tcsh wrapper around the MNI N3 (`nu_correct`) bias-field-correction tool | shell (tcsh) | 📝 draft |
| [[mri_reorient_LR.csh]] | is a tcsh script that reorients a brain MRI volume in the left-right direction | csh | 📝 draft |
| [[recon-all-clinical.sh]] | is a rapid cortical reconstruction pipeline designed for clinical MRI scans of arbitrary contrast, o | tcsh | 📝 draft |
| [[recon-all-exvivo]] | is a FreeSurfer pipeline script for processing ex vivo (post-mortem) brain tissue MRI | tcsh | 📝 draft |
| [[talairach]] | is a tcsh wrapper script that computes the Talairach registration for a FreeSurfer subject by callin | tcsh | 📝 draft |
| [[talairach2]] | is a convenience tcsh wrapper script that performs Talairach registration for a FreeSurfer subject u | tcsh | 📝 draft |
| [[talairach_afd]] | (Automatic Failure Detection) automatically detects failures in Talairach alignment by comparing a s | C++ | 📝 draft |
| [[talairach_avi]] | is a tcsh wrapper around Avi Snyder's `4dfp` image registration toolchain (`mpr2mni305`, `imgreg_4df | shell (tcsh) | 📝 draft |
| [[talairach_mgh]] | is a very short tcsh script that performs Talairach registration using an old MGH-specific method: i | tcsh | 📝 draft |

## GUI Tools

| Tool | Summary | Language | Status |
|------|---------|----------|--------|
| [[freeview]] | FreeSurfer's primary interactive visualisation and editing application — hub page with menus (File/Edit/View/Layer/Action/Tools/Help), toolbar, 8 data types, coordinate info panel | C++ | 🔎 review |
| [[freeview-volumes]] | FreeView volume layers: 10 colour maps (incl. Turbo, Hue), all panel controls, isosurface, vector/tensor display, complete inline property reference | C++ | 🔎 review |
| [[freeview-surfaces]] | FreeView surface layers: render modes (Surface/Wireframe/Surface+Wireframe), overlay Configure dialog (3-pt threshold), Reposition Vertex (3-tab dialog), complete inline property reference | C++ | 🔎 review |
| [[freeview-editing]] | FreeView editing modes: 10 drawing sub-tools (incl. Livewire, ScribblePrompt), Recon Edit control, ROI→label format, Measure tool types | C++ | 🔎 review |
| [[freeview-command-line]] | FreeView command-line reference: all flags from main.cpp CmdLineEntry table, volume/surface/label/pointset inline property syntax, CSS/SVG colour names | C++ | 🔎 review |
| [[freeview-keyboard-mouse]] | FreeView keyboard shortcuts (60+ confirmed from MainWindow.ui) and mouse actions for all modes | C++ | 🔎 review |
| [[freeview-3d-view]] | FreeView 3D rendering: trackball camera, 8 view presets, slice planes, isosurface, no DVR, DialogSetCamera | C++ | 🔎 review |
| [[freeview-dti]] | FreeView DTI: direction-coded colour (6 permutations), TrackVis tract loading, ODF display | C++ | 🔎 review |
| [[freeview-pointsets]] | FreeView point sets: ControlPoint/.dat, WayPoint/.label, Enhanced/.json types; panel controls, coordinate system, DialogControlPointComment | C++ | 🔎 review |
| [[tkmedit]] | was FreeSurfer's original Tk/Tcl-based interactive volume editor and viewer | tcl | 📝 draft |
| [[tkmeditfv]] | is a tcsh wrapper script that translates `tkmedit`-style command-line arguments into [[freeview]] ar | tcsh | 📝 draft |
| [[tksurfer]] | was FreeSurfer's original Tk/Tcl-based interactive surface viewer | tcl | 📝 draft |
| [[tksurferfv]] | is a tcsh wrapper script that translates `tksurfer`-style command-line arguments into [[freeview]] a | tcsh | 📝 draft |
| [[tkregister2]] | interactive GUI and command-line tool for manual registration editing and transform format conversion; historical source of the tkRAS convention | C++ | 📝 draft |

## Gotchas

| Topic | Summary | Status |
|-------|---------|--------|
| _none yet_ | | |

## Internals

| Module | Summary | Status |
|--------|---------|--------|
| [[internal-gcamorph]] | GCA Morph non-linear deformation library: GCA_MORPH struct, .m3z binary layout, energy functional | 📝 draft |

## External Contributions

| Page | Summary | Status |
|------|---------|--------|
| [[faq]] | Frequently asked questions with provenance-tracked answers from mailing list archives and source code analysis | ⬜ |

