// MSP Revenue Scaling Roadmap - Main JavaScript File
// This file contains all interactive functionality and Google Sheet formulas

// ============================================================================
// GOOGLE SHEET FORMULAS AND STRUCTURE
// ============================================================================

/*
GOOGLE SHEET STRUCTURE:

Tab 1: Snapshot
- B2: ARR (input)
- B3: MRR (input) 
- B4: MRR clients (input)
- B5: Avg MRR per client =IFERROR(B3/B4,0)
- B6: Service revenue monthly (input)
- B7: Service COGS monthly (input)
- B8: Service GM % =IFERROR((B6-B7)/B6,0)
- B9: Sales and marketing spend this period (input)
- B10: New clients this period (input)
- B11: CAC =IFERROR(B9/B10,0)
- B12: Avg retention months (input)
- B13: Avg monthly gross margin per client =IFERROR((B8*B5),0)
- B14: LTV =B13*B12
- B15: LTV/CAC =IFERROR(B14/B11,0)
- B16: AR balance today (input)
- B17: Revenue last 90 days (input or link to KPIs)
- B18: DSO =IFERROR(B16/(B17/90),0)
- B19: FTE count (input)
- B20: Staff-to-revenue ratio =IFERROR(B2/B19,0)
- B21: Total available hours per FTE per week (input, default 40)
- B22: Total billable hours last week (input)
- B23: Utilization % =IFERROR(B22/(B19*B21),0)
- B24: SLA attainment % (input)
- B25: CSAT/NPS (input)

Tab 2: Phase_Assessment
- B2: Revenue band drop-down from Data_Validation!A2:A6
- B3: Client count
- B4: Average MRR per client
- B6: PSA in place (TRUE/FALSE)
- B7: SOPs documented (TRUE/FALSE)
- B8: AR automation live (TRUE/FALSE)
- B9: AM/TBR cadence (TRUE/FALSE)
- B10: Finance controller in seat (TRUE/FALSE)
- B12: Red flags count =COUNTIF(B6:B10,FALSE)
- B14: Phase =IFS(
    B2="<1M","Phase 1",
    B2="1–3M","Phase 2", 
    B2="3–5M","Phase 3",
    AND(B2="~5M plateau",B12>=2),"Phase 4",
    AND(B2="5–10M",B12>=2),"Phase 4",
    B2="5–10M","Phase 5",
    TRUE,"Review inputs")
- B15: Risk score =IFS(B12>=3,"High",B12=2,"Medium",TRUE,"Low")
- B16: Pages to read =CHOOSE(MATCH(B14,{"Phase 1","Phase 2","Phase 3","Phase 4","Phase 5"},0),"5–6","7–8","9–10","11–13","14–15")

Tab 3: KPIs
- Date, Revenue, MRR, New clients, Churned clients, Service revenue, Service COGS, Service GM %, AR balance, DSO, FTEs, Utilization %, SLA attainment %
- Service GM % =IFERROR((F2-G2)/F2,0)
- DSO =IFERROR(I2/(B2/30),0)

Tab 4: CAC_LTV
- Period start date, end date, Sales and marketing spend, New clients acquired, Avg MRR per new client, Service GM %, Avg retention months
- CAC =IFERROR(C3/C4,0)
- LTV = (C5*C6)*C7
- LTV/CAC =IFERROR(C9/C8,0)

Tab 5: AR_DSO
- Month, Revenue that month, Collections that month, Ending AR, DSO =IFERROR(D2/(B2/30),0)

Tab 6: GMbyService
- Service name, Monthly revenue, Monthly COGS, GM $, GM %
- GM % =IFERROR((B2-C2)/B2,0)

Tab 7: Utilization
- Week start, FTE count, Available hours per FTE, Total available hours, Billable hours logged, Utilization %
- Utilization % =IFERROR(E2/D2,0)

Tab 8: Backward_Plan
- Target ARR at exit, Target date, Current ARR, Current MRR, ARPA, Logo churn rate, Revenue churn rate, AM expansion rate, Win rate
- Months to target =DATEDIF(TODAY(),C2,"M")
- Required ARR delta =B2-C2
- Required MRR delta =Required ARR delta/12
- Projected expansion MRR =Current MRR*(1+AM rate)^Months - Current MRR
- Churned MRR over period =Current MRR*((1-Rev churn)^Months - 1)
- Net-new MRR needed =Required MRR delta - Projected expansion MRR + ABS(Churned MRR over period)
- Net-new clients needed =IFERROR(Net-new MRR needed/ARPA,0)
- Pipeline needed (3x) =IFERROR(Net-new clients needed/Win rate*3,0)

Tab 9: Cash90Day
- Starting cash, Starting AR, Current DSO, Monthly recurring revenue, Monthly project revenue, Monthly COGS, Monthly OpEx, One-time investments
- Collections per month =Revenue*(min(30,DSO)/30)
- Cash inflows =Collections from AR + current month collections
- Cash outflows =COGS + OpEx + investments
- Ending cash =Starting cash + inflows - outflows
- Runway months =IFERROR(Ending cash/(OpEx+COGS),0)

Tab 10: Checklists
- Phase, Item, Owner, Due date, Status
- Status options: Not started, In progress, Done

Tab 11: Data_Validation
- Revenue band list: <1M, 1–3M, 3–5M, ~5M plateau, 5–10M
- Status list: Not started, In progress, Done
*/

// ============================================================================
// INTERACTIVE FUNCTIONALITY
// ============================================================================

class MSPRevenueRoadmap {
    constructor() {
        this.currentPhase = 1;
        this.assessmentData = {};
        this.metricsData = {};
        this.checklistProgress = {};
        
        this.init();
    }
    
    init() {
        this.loadSavedData();
        this.setupEventListeners();
        this.initializeAnimations();
    }
    
    loadSavedData() {
        // Load assessment data
        const savedAssessment = localStorage.getItem('assessmentData');
        if (savedAssessment) {
            this.assessmentData = JSON.parse(savedAssessment);
        }
        
        // Load metrics data
        const savedMetrics = localStorage.getItem('metricsData');
        if (savedMetrics) {
            this.metricsData = JSON.parse(savedMetrics);
        }
        
        // Load checklist progress
        for (let phase = 1; phase <= 5; phase++) {
            const savedProgress = localStorage.getItem(`phase${phase}Progress`);
            if (savedProgress) {
                this.checklistProgress[phase] = JSON.parse(savedProgress);
            }
        }
    }
    
    setupEventListeners() {
        // Navigation handlers
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-navigate]')) {
                const target = e.target.getAttribute('data-navigate');
                this.navigateTo(target);
            }
        });
        
        // Form handlers
        document.addEventListener('submit', (e) => {
            if (e.target.matches('.assessment-form')) {
                e.preventDefault();
                this.handleAssessmentSubmit(e.target);
            }
        });
        
        // Input handlers for real-time calculations
        document.addEventListener('input', (e) => {
            if (e.target.matches('.metric-input')) {
                this.calculateMetrics();
            }
        });
    }
    
    navigateTo(page) {
        if (page.startsWith('http')) {
            window.open(page, '_blank');
        } else {
            window.location.href = page;
        }
    }
    
    calculateMetrics() {
        // Get all metric inputs
        const arr = parseFloat(document.getElementById('arr')?.value) || 0;
        const mrr = parseFloat(document.getElementById('mrr')?.value) || 0;
        const mrrClients = parseFloat(document.getElementById('mrrClients')?.value) || 0;
        const serviceRevenue = parseFloat(document.getElementById('serviceRevenue')?.value) || 0;
        const serviceCogs = parseFloat(document.getElementById('serviceCogs')?.value) || 0;
        const marketingSpend = parseFloat(document.getElementById('marketingSpend')?.value) || 0;
        const newClients = parseFloat(document.getElementById('newClients')?.value) || 0;
        const retentionMonths = parseFloat(document.getElementById('retentionMonths')?.value) || 0;
        const arBalance = parseFloat(document.getElementById('arBalance')?.value) || 0;
        const revenue90d = parseFloat(document.getElementById('revenue90d')?.value) || 0;
        const fteCount = parseFloat(document.getElementById('fteCount')?.value) || 0;
        const availableHours = parseFloat(document.getElementById('availableHours')?.value) || 40;
        const billableHours = parseFloat(document.getElementById('billableHours')?.value) || 0;

        // Calculate metrics
        const avgMrrPerClient = mrrClients > 0 ? mrr / mrrClients : 0;
        const serviceGM = serviceRevenue > 0 ? ((serviceRevenue - serviceCogs) / serviceRevenue) * 100 : 0;
        const cac = newClients > 0 ? marketingSpend / newClients : 0;
        const monthlyGrossMarginPerClient = avgMrrPerClient * (serviceGM / 100);
        const ltv = monthlyGrossMarginPerClient * retentionMonths;
        const ltvCacRatio = cac > 0 ? ltv / cac : 0;
        const dso = revenue90d > 0 ? (arBalance / (revenue90d / 90)) : 0;
        const staffRevenueRatio = fteCount > 0 ? arr / fteCount : 0;
        const totalAvailableHours = fteCount * availableHours;
        const utilizationRate = totalAvailableHours > 0 ? (billableHours / totalAvailableHours) * 100 : 0;

        // Update UI elements
        this.updateMetricDisplay('avgMrrPerClient', avgMrrPerClient, '$', 0);
        this.updateMetricDisplay('serviceGM', serviceGM, '', 1, '%');
        this.updateMetricDisplay('cac', cac, '$', 0);
        this.updateMetricDisplay('ltv', ltv, '$', 0);
        this.updateMetricDisplay('ltvCacRatio', ltvCacRatio, '', 1);
        this.updateMetricDisplay('dso', dso, '', 0, ' days');
        this.updateMetricDisplay('staffRevenueRatio', staffRevenueRatio, '$', 0);
        this.updateMetricDisplay('utilizationRate', utilizationRate, '', 1, '%');

        // Apply conditional formatting
        this.applyConditionalFormatting('serviceGM', serviceGM, 60, 65);
        this.applyConditionalFormatting('ltvCacRatio', ltvCacRatio, 2.5, 3.0);
        this.applyConditionalFormatting('dso', dso, 45, 35, true);
        this.applyConditionalFormatting('utilizationRate', utilizationRate, 65, 70);

        // Save metrics data
        this.metricsData = {
            arr, mrr, mrrClients, avgMrrPerClient, serviceGM, cac, ltv, ltvCacRatio,
            dso, staffRevenueRatio, utilizationRate
        };
        localStorage.setItem('metricsData', JSON.stringify(this.metricsData));
    }
    
    updateMetricDisplay(elementId, value, prefix = '', decimals = 0, suffix = '') {
        const element = document.getElementById(elementId);
        if (element) {
            const formattedValue = value.toLocaleString(undefined, {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            });
            element.textContent = prefix + formattedValue + suffix;
        }
    }
    
    applyConditionalFormatting(elementId, value, redThreshold, greenThreshold, reverse = false) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        let className = 'text-gray-800';
        
        if (reverse) {
            // For metrics where lower is better (DSO)
            if (value < greenThreshold) {
                className = 'text-green-600';
            } else if (value <= redThreshold) {
                className = 'text-yellow-600';
            } else {
                className = 'text-red-600';
            }
        } else {
            // For metrics where higher is better
            if (value >= greenThreshold) {
                className = 'text-green-600';
            } else if (value >= redThreshold) {
                className = 'text-yellow-600';
            } else {
                className = 'text-red-600';
            }
        }
        
        element.className = element.className.replace(/text-\w+-\d+/, '') + ' ' + className;
    }
    
    handleAssessmentSubmit(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Process assessment data
        this.processAssessmentData(data);
    }
    
    processAssessmentData(data) {
        // Calculate red flags (missing systems)
        const systems = {
            psa: data.psa === 'on',
            sops: data.sops === 'on',
            arAuto: data.arAuto === 'on',
            amTbr: data.amTbr === 'on',
            finance: data.finance === 'on'
        };
        
        const redFlags = Object.values(systems).filter(system => !system).length;
        
        // Determine phase
        let phase, pageRange, risk;
        
        switch(data.revenueBand) {
            case '<1M':
                phase = 'Phase 1';
                pageRange = '5-6';
                break;
            case '1–3M':
                phase = 'Phase 2';
                pageRange = '7-8';
                break;
            case '3–5M':
                phase = 'Phase 3';
                pageRange = '9-10';
                break;
            case '~5M plateau':
                phase = redFlags >= 2 ? 'Phase 4' : 'Phase 3';
                pageRange = redFlags >= 2 ? '11-13' : '9-10';
                break;
            case '5–10M':
                phase = redFlags >= 2 ? 'Phase 4' : 'Phase 5';
                pageRange = redFlags >= 2 ? '11-13' : '14-15';
                break;
        }
        
        // Determine risk
        if (redFlags >= 3) {
            risk = 'High Risk';
        } else if (redFlags === 2) {
            risk = 'Medium Risk';
        } else {
            risk = 'Low Risk';
        }
        
        // Save assessment data
        this.assessmentData = {
            revenueBand: data.revenueBand,
            clientCount: parseInt(data.clientCount),
            avgMRR: parseInt(data.avgMRR),
            phase,
            pageRange,
            risk,
            redFlags,
            systems
        };
        
        localStorage.setItem('assessmentData', JSON.stringify(this.assessmentData));
        
        // Update UI
        this.updateAssessmentResults();
    }
    
    updateAssessmentResults() {
        // Update phase badge
        const phaseBadge = document.getElementById('phaseBadge');
        if (phaseBadge) {
            phaseBadge.textContent = this.assessmentData.phase;
        }
        
        // Update page range
        const pageRange = document.getElementById('pageRange');
        if (pageRange) {
            pageRange.textContent = this.assessmentData.pageRange;
        }
        
        // Update risk assessment
        const riskBadge = document.getElementById('riskBadge');
        const riskDescription = document.getElementById('riskDescription');
        
        if (riskBadge && riskDescription) {
            riskBadge.textContent = this.assessmentData.risk;
            
            let riskClass, riskDesc;
            switch(this.assessmentData.risk) {
                case 'High Risk':
                    riskClass = 'risk-high';
                    riskDesc = 'Multiple system gaps detected - immediate attention needed';
                    break;
                case 'Medium Risk':
                    riskClass = 'risk-medium';
                    riskDesc = 'Some system gaps identified - prioritize improvements';
                    break;
                case 'Low Risk':
                    riskClass = 'risk-low';
                    riskDesc = 'Good system foundation - focus on optimization';
                    break;
            }
            
            riskBadge.className = `px-3 py-1 rounded-full text-sm font-medium text-white ${riskClass}`;
            riskDescription.textContent = riskDesc;
        }
        
        // Generate and update recommendations
        this.generateRecommendations();
        
        // Show results panel
        const resultsPanel = document.getElementById('resultsPanel');
        const instructionsPanel = document.getElementById('instructionsPanel');
        
        if (resultsPanel && instructionsPanel) {
            resultsPanel.classList.remove('hidden');
            instructionsPanel.classList.add('hidden');
        }
    }
    
    generateRecommendations() {
        const recommendationsDiv = document.getElementById('recommendations');
        if (!recommendationsDiv) return;
        
        let recommendations = [];
        const { phase, systems } = this.assessmentData;
        
        // Phase-specific recommendations
        switch(phase) {
            case 'Phase 1':
                recommendations = [
                    'Define your service offerings with clear scope and pricing',
                    'Document SOPs for top 10 ticket types',
                    'Implement basic time tracking and billing',
                    'Calculate your current CAC and benchmark against industry'
                ];
                break;
            case 'Phase 2':
                recommendations = [
                    'Define your Ideal Customer Profile (ICP)',
                    'Productize your services into packages',
                    'Implement CRM with sales pipeline',
                    'Start quarterly TBRs with key clients'
                ];
                break;
            case 'Phase 3':
                recommendations = [
                    'Hire operations and finance roles',
                    'Implement AR automation',
                    'Build financial dashboard with GM by service',
                    'Standardize and automate processes'
                ];
                break;
            case 'Phase 4':
                recommendations = [
                    'Conduct immediate billing audit and price increases',
                    'Implement weekly cash meetings',
                    'Enforce ICP and exit non-ideal clients',
                    'Build AM pipeline for expansion'
                ];
                break;
            case 'Phase 5':
                recommendations = [
                    'Set BHAG and Financial Freedom Number',
                    'Align compensation to margin and growth',
                    'Implement quarterly board-style reviews',
                    'Ensure no client >10% of revenue'
                ];
                break;
        }
        
        // Add system-specific recommendations
        if (!systems.psa) recommendations.push('Implement PSA system immediately');
        if (!systems.sops) recommendations.push('Document core operational procedures');
        if (!systems.arAuto) recommendations.push('Set up automated billing and collections');
        if (!systems.amTbr) recommendations.push('Establish quarterly business reviews');
        if (!systems.finance) recommendations.push('Hire finance controller or outsource');
        
        // Render recommendations
        recommendationsDiv.innerHTML = recommendations.map(rec => `
            <div class="flex items-start space-x-3">
                <i class="fas fa-arrow-right text-teal-600 mt-1"></i>
                <span class="text-gray-700">${rec}</span>
            </div>
        `).join('');
    }
    
    // Checklist functionality
    toggleChecklistItem(phase, itemId) {
        const currentState = localStorage.getItem(`phase${phase}_${itemId}`) === 'true';
        localStorage.setItem(`phase${phase}_${itemId}`, !currentState);
        
        // Update checklist display
        this.updateChecklistProgress(phase);
    }
    
    updateChecklistProgress(phase) {
        const checklistItems = this.getChecklistItems(phase);
        let completedItems = 0;
        
        checklistItems.forEach(item => {
            if (localStorage.getItem(`phase${phase}_${item.id}`) === 'true') {
                completedItems++;
            }
        });
        
        // Update progress display
        const progressElement = document.getElementById('checklistProgress');
        const totalElement = document.getElementById('checklistTotal');
        const progressBar = document.getElementById('checklistProgressBar');
        
        if (progressElement && totalElement && progressBar) {
            progressElement.textContent = completedItems;
            totalElement.textContent = checklistItems.length;
            progressBar.style.width = `${(completedItems / checklistItems.length) * 100}%`;
        }
        
        // Save progress
        localStorage.setItem(`phase${phase}Progress`, JSON.stringify({
            completed: completedItems,
            total: checklistItems.length
        }));
    }
    
    getChecklistItems(phase) {
        const checklists = {
            1: [
                { id: 'services', text: 'Define services with scope, exclusions, SLAs, pricing, profit per service' },
                { id: 'sops', text: 'Document SOPs for top 10 tickets and onboarding' },
                { id: 'profit', text: 'Track profit per client and reprice/exit low-margin accounts' },
                { id: 'cac', text: 'Calculate CAC and benchmark vs industry standards' },
                { id: 'stack', text: 'Build technology stack on value lenses' },
                { id: 'ar', text: 'Implement basic AR workflow and payment terms' },
                { id: 'psa', text: 'Deploy PSA lite or CRM system' },
                { id: 'tracking', text: 'Set up time tracking for all billable activities' }
            ],
            2: [
                { id: 'icp', text: 'Define ICP with seats, industries, compliance, budget, tech profile' },
                { id: 'packages', text: 'Productize services into Good/Better/Best packages' },
                { id: 'pricing', text: 'Set tiered pricing, SLAs, minimums, and rate cards' },
                { id: 'crm', text: 'Implement CRM with sales pipeline and exit criteria' },
                { id: 'proposals', text: 'Create proposal templates and MSAs' },
                { id: 'followup', text: 'Set up automated follow-up sequences' },
                { id: 'tbr', text: 'Launch quarterly TBRs for every MRR client' },
                { id: 'amrole', text: 'Define account manager role and responsibilities' },
                { id: 'pruning', text: 'Audit and prune non-ICP clients' },
                { id: 'leadership', text: 'Establish weekly ops, monthly metrics, quarterly planning' }
            ],
            3: [
                { id: 'orgchart', text: 'Create org chart and role scorecards for key positions' },
                { id: 'psa', text: 'Full PSA adoption with >95% time tracking compliance' },
                { id: 'arauto', text: 'Implement AR automation and payments on file system' },
                { id: 'dashboard', text: 'Build financial dashboard with weekly GM by service' },
                { id: 'playbooks', text: 'Create standardization playbooks for all processes' },
                { id: 'automations', text: 'Deploy automations for provisioning, licensing, monitoring' },
                { id: 'dataflows', text: 'Map and optimize all data flows between systems' },
                { id: 'capacity', text: 'Define utilization targets and capacity planning process' },
                { id: 'qbr', text: 'Build QBR engine with project forecasting capabilities' },
                { id: 'integration', text: 'Create unified customer view across all platforms' }
            ],
            4: [
                { id: 'billing_audit', text: 'Conduct emergency billing audit and identify issues' },
                { id: 'price_increases', text: 'Issue price increases for underpriced services' },
                { id: 'ar_live', text: 'Get AR automation system live immediately' },
                { id: 'payment_terms', text: 'Tighten payment terms and policies' },
                { id: 'headcount_plan', text: 'Create headcount plan tied to pipeline and utilization' },
                { id: 'freeze_hires', text: 'Freeze non-critical hiring until stabilized' },
                { id: 'quality_gates', text: 'Implement quality gates and problem management' },
                { id: 'post_incident', text: 'Establish post-incident review process' },
                { id: 'icp_enforcement', text: 'Strictly enforce ICP and exit non-ideal clients' },
                { id: 'weekly_cash', text: 'Start weekly cash flow and margin tracking meetings' },
                { id: 'am_pipeline', text: 'Build AM pipeline >20% of MRR' },
                { id: 'project_recovery', text: 'Recover delayed or over-budget projects' }
            ],
            5: [
                { id: 'bhag', text: 'Set BHAG and Financial Freedom Number' },
                { id: 'backward', text: 'Create backward plan to exit metrics' },
                { id: 'targets', text: 'Define quarterly targets and milestones' },
                { id: 'compensation', text: 'Align compensation to margin and growth metrics' },
                { id: 'churn_analysis', text: 'Implement quarterly churn analysis and save plays' },
                { id: 'client_concentration', text: 'Ensure no client >10% of revenue' },
                { id: 'board_reviews', text: 'Establish quarterly board-style reviews' },
                { id: 'documentation', text: 'Document all processes for handover' },
                { id: 'management_team', text: 'Build management team that can run without you' },
                { id: 'exit_prep', text: 'Prepare financial and legal documentation' }
            ]
        };
        
        return checklists[phase] || [];
    }
    
    initializeAnimations() {
        // Add smooth scrolling
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
        
        // Add intersection observer for animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observe elements for animation
        document.querySelectorAll('.action-card, .template-card, .resource-card').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    }
    
    // Utility functions
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
    
    formatPercentage(value, decimals = 1) {
        return (value * 100).toFixed(decimals) + '%';
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.mspRoadmap = new MSPRevenueRoadmap();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MSPRevenueRoadmap;
}